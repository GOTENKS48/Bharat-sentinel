from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Bharat-AI Service")

class TextRequest(BaseModel):
    text: str

@app.post("/analyze")
async def analyze_text(req: TextRequest):
    # Placeholder AI logic
    text = req.text
    result = {"text": text, "sentiment": "neutral", "flags": []}
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
