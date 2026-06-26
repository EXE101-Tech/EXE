from app.database import engine, Base
from app.models import Post, PostImage
PostImage.__table__.drop(engine, checkfirst=True)
Post.__table__.drop(engine, checkfirst=True)
Base.metadata.create_all(bind=engine)
print("Dropped and recreated posts and post_images")
