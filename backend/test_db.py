from app.database import SessionLocal, engine
from app import models

def run_tests():
    print("✅ Starting DB tests...")

    # Create tables (safeguard)
    models.Base.metadata.create_all(bind=engine)
    print("Tables ensured.")

    db = SessionLocal()

    try:
        # -------------------- Create a Campaign --------------------
        campaign = models.Campaign(name="Test Campaign", description="Verify IDs")
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        print("Campaign ID:", campaign.id)

        # -------------------- Add Contacts --------------------
        contact1 = models.Contact(name="Alice", email="alice@example.com", campaign_id=campaign.id)
        contact2 = models.Contact(name="Bob", email="bob@example.com", campaign_id=campaign.id)
        db.add_all([contact1, contact2])
        db.commit()
        db.refresh(contact1)
        db.refresh(contact2)
        print("Contact1 ID:", contact1.id, "Campaign ID:", contact1.campaign_id)
        print("Contact2 ID:", contact2.id, "Campaign ID:", contact2.campaign_id)

        # -------------------- Add EmailLog --------------------
        email = models.EmailLog(
            recipient_email="alice@example.com",
            subject="Welcome!",
            body="This is a test email.",
            campaign_id=campaign.id
        )
        db.add(email)
        db.commit()
        db.refresh(email)
        print("EmailLog ID:", email.id, "Campaign ID:", email.campaign_id)

        # -------------------- Verify Relationships --------------------
        campaign_from_db = db.query(models.Campaign).filter_by(id=campaign.id).first()
        print("Contacts linked to campaign:", [c.name for c in campaign_from_db.contacts])
        print("Emails linked to campaign:", [e.subject for e in campaign_from_db.emails])

    finally:
        db.close()
        print("✅ DB session closed.")

if __name__ == "__main__":
    run_tests()
