import atexit
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from apscheduler.schedulers.background import BackgroundScheduler
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import csv
import io

# ... all your imports remain the same ...

# ==== Configuration ====
SECRET_KEY = "your_secret_key_here"

# ==== Initialize App ====
app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:admin@localhost:5432/neighborhood_safety'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
logging.basicConfig(level=logging.DEBUG)

# ==== Models ====
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(500), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin', 'resolver'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def serialize(self):
        return {"id": self.id, "username": self.username, "role": self.role}

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(1000), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime)
    assigned_to = db.Column(db.String(100), db.ForeignKey('user.username'), nullable=True)
    assigned_user = db.relationship("User", backref="incidents")

    def serialize(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            'lat': self.lat,
            'lng': self.lng,
            'created_at': self.created_at.isoformat() + 'Z',
            'resolved': self.resolved,
            'resolved_at': self.resolved_at.isoformat() + 'Z' if self.resolved_at else None,
            'assigned_to': self.assigned_to,
            'assigned_username': self.assigned_user.username if self.assigned_user else None
        }

class IncidentArchive(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    csv_content = db.Column(db.Text, nullable=False)  # Stores cumulative CSV content

with app.app_context():
    db.create_all()

# ==== Auth Helpers ====
def generate_token(user):
    return jwt.encode({
        "user_id": user.id,
        "username": user.username,
        "role": user.role
    }, SECRET_KEY, algorithm="HS256")

def verify_token(request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# ==== Routes ====
@app.route("/api/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return '', 200

    data = request.json
    user = User.query.filter_by(username=data.get("username")).first()
    if user and user.check_password(data.get("password")):
        token = generate_token(user)
        return jsonify({"token": token})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/api/users", methods=["GET"])
def get_users():
    return jsonify([u.serialize() for u in User.query.all()])

@app.route("/api/incidents", methods=["GET", "POST"])
def handle_incidents():
    if request.method == "GET":
        try:
            incidents = Incident.query.filter_by(resolved=False).all()
            return jsonify([i.serialize() for i in incidents])
        except SQLAlchemyError as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "POST":
        try:
            data = request.json
            new_incident = Incident(
                title=data['title'],
                description=data['description'],
                location=data['location'],
                lat=data['lat'],
                lng=data['lng']
            )
            db.session.add(new_incident)
            db.session.commit()
            return jsonify(new_incident.serialize()), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route("/api/incidents/<int:id>", methods=["GET"])
def get_incident(id):
    incident = db.session.get(Incident, id)
    if not incident:
        return jsonify({'error': 'Incident not found'}), 404
    return jsonify(incident.serialize())

@app.route("/api/incidents/<int:id>/assign", methods=["PATCH"])
def assign_incident(id):
    user_data = verify_token(request)
    if not user_data or user_data['role'] != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json
    username = data.get("username")

    incident = db.session.get(Incident, id)
    if not incident:
        return jsonify({"error": "Incident not found"}), 404

    if username is None:
        incident.assigned_to = None
        db.session.commit()
        return jsonify(incident.serialize())

    user = db.session.execute(
        db.select(User).filter_by(username=username)
    ).scalar_one_or_none()

    if not user:
        return jsonify({"error": "User not found"}), 404

    incident.assigned_to = user.username
    db.session.commit()
    return jsonify(incident.serialize())

@app.route("/api/incidents/<int:id>/resolve", methods=["PATCH"])
def resolve_incident(id):
    user_data = verify_token(request)
    if not user_data:
        return jsonify({"error": "Unauthorized"}), 403

    incident = db.session.get(Incident, id)
    if not incident:
        return jsonify({'error': 'Incident not found'}), 404

    if incident.assigned_to != user_data["username"] and user_data["role"] != "admin":
        return jsonify({"error": "Not authorized to resolve this incident"}), 403

    incident.resolved = True
    incident.resolved_at = datetime.utcnow()

    # Write resolved incident row to CSV
    output = io.StringIO(newline='')  # <--- FIX: prevents blank lines
    writer = csv.writer(output)
    writer.writerow([
        incident.title,
        incident.description,
        incident.location,
        incident.lat,
        incident.lng,
        incident.created_at.isoformat(),
        incident.resolved_at.isoformat(),
        incident.assigned_to or ''
    ])
    csv_row = output.getvalue().strip()

    # Append to IncidentArchive
    archive = IncidentArchive.query.order_by(IncidentArchive.created_at.desc()).first()
    if archive:
        if archive.csv_content.strip():
            archive.csv_content += '\n' + csv_row
        else:
            archive.csv_content = "Title,Description,Location,Lat,Lng,Created At,Resolved At,Resolved By\n" + csv_row
    else:
        archive = IncidentArchive(
            csv_content="Title,Description,Location,Lat,Lng,Created At,Resolved At,Resolved By\n" + csv_row
        )
        db.session.add(archive)

    db.session.commit()
    return jsonify(incident.serialize())



@app.route('/api/resolved-incidents', methods=['GET'])
def get_resolved_incidents():
    try:
        resolved_incidents = Incident.query.filter_by(resolved=True).all()
        return jsonify([incident.serialize() for incident in resolved_incidents])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/my-assigned-incidents", methods=["GET"])
def my_assigned_incidents():
    user_data = verify_token(request)
    if not user_data or user_data["role"] != "resolver":
        return jsonify({"error": "Unauthorized"}), 403

    incidents = Incident.query.filter_by(assigned_to=user_data["username"], resolved=False).all()
    return jsonify([incident.serialize() for incident in incidents])

# ==== Cleanup (Only Deletion) ====
def delete_old_resolved_incidents():
    with app.app_context():
        try:
            cutoff = datetime.utcnow() - timedelta(days=1)
            old_incidents = Incident.query.filter(
                Incident.resolved == True,
                Incident.resolved_at < cutoff
            ).all()

            for incident in old_incidents:
                db.session.delete(incident)

            db.session.commit()
        except Exception as e:
            app.logger.error(f"Cleanup error: {str(e)}")

@app.route("/api/incident-archive", methods=["GET"])
def get_incident_archive():
    try:
        archive = IncidentArchive.query.order_by(IncidentArchive.created_at.desc()).first()
        if not archive:
            return jsonify({"message": "No archive found"}), 404
        return jsonify({"csv": archive.csv_content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==== Scheduler ====
scheduler = BackgroundScheduler(daemon=True)
scheduler.add_job(delete_old_resolved_incidents, trigger='interval', seconds=20)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())

if __name__ == "__main__":
    app.run(debug=True)
