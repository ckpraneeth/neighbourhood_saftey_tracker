from app import app, db, User

def create_users():
    with app.app_context():
        # Check if admin user exists
        '''if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', role='admin')
            admin.set_password('admin123')  # CHANGE to strong password
            db.session.add(admin)
            print("Admin user created.")
        else:
            print("Admin user already exists.")'''

        # Check if resolver user exists
        if not User.query.filter_by(username='Health_Department').first():
            resolver = User(username='Health_Department', role='resolver')
            resolver.set_password('Health_Department123')  # CHANGE to strong password
            db.session.add(resolver)
            print("Resolver user created.")
        else:
            print("Resolver user already exists.")

        db.session.commit()
        print("Users committed to database.")

if __name__ == "__main__":
    create_users()
