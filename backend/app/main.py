from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "FYP Finder API is running!"}