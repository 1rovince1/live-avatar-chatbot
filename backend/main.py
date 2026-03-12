import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import subprocess
import os
import time
# from gtts import gTTS
import edge_tts
from pydub import AudioSegment
from dotenv import load_dotenv
from google import genai
from google.genai import types

# --- Load Environment Variables ---
load_dotenv() 
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Please set it in the .env file.")


AVATAR_SYSTEM_PROMPT = """User says:

"I’m not feeling well" (or anything similar)
Bot/Assistant replies:

"I’m sorry to hear that. Could you tell me what you’re suffering from? Is it Fever, Cold, or Headache?"
User responds with one of the options
Bot replies with a short remedy depending on the choice:


If Fever:

"For fever, make sure to stay hydrated, get plenty of rest, and take paracetamol if needed. If it persists, please see a doctor."


If Cold:

"For cold, drink warm fluids, inhale steam, and rest well. A little honey with ginger can also help soothe your throat."


If Headache:

"For headache, try resting in a quiet, dark room, drink water, and gently massage your temples. If it continues, you might consider a mild pain reliever."
"""

# Initialize the new client
client = genai.Client(api_key=api_key)

# Configure the system instructions
config = types.GenerateContentConfig(
    system_instruction=AVATAR_SYSTEM_PROMPT,
    thinking_config=types.ThinkingConfig(
        thinking_budget=0
    )
)

# Start the persistent chat session
# Note: We can also upgrade you to the newer, faster 2.5-flash model!
chat_session = client.chats.create(
    model="gemini-2.5-flash", 
    config=config
)

print("New Gemini chat session started with system prompt.")


# --- Configuration ---
# RHUBARB_PATH = os.path.join("rhubarb", "rhubarb.exe" if os.name == 'nt' else "rhubarb")
RHUBARB_PATH = os.getenv("RHUBARB_PATH", os.path.join("rhubarb", "rhubarb.exe" if os.name == 'nt' else "rhubarb"))

# --- FastAPI App Initialization ---
app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    voice: str = "female"

# --- Helper Functions (unchanged) ---
def create_lipsync_data(audio_path: str, output_path: str):
    print(f"Generating lipsync for {audio_path}...")
    command = [RHUBARB_PATH, "-f", "json", "-o", output_path, audio_path]
    try:
        process = subprocess.run(command, check=True, capture_output=True, text=True)
    except Exception as e:
        print(f"Error during Rhubarb execution: {e}")
        return False
    return True

# ===============================================
# ==     UPDATED /chat ENDPOINT WITH SESSION   ==
# ===============================================
@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Handles chat requests using the persistent chat session.
    """
    try:
        print(f"User message: '{request.message}'")
        print("Sending message to Gemini chat session...")
        
        # Use the session to send the message, which includes history
        response = chat_session.send_message(request.message)
        response_text = response.text
        print(f"Gemini response: '{response_text}'")

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        response_text = "Sorry, I'm having a little trouble thinking right now."

    # --- File generation logic (the rest is the same) ---
    timestamp = int(time.time())
    mp3_filename = f"response_{timestamp}.mp3"
    wav_filename = f"response_{timestamp}.wav"
    lipsync_filename = f"response_{timestamp}.json"
    generated_dir = os.path.join("..", "generated")
    os.makedirs(generated_dir, exist_ok=True)
    mp3_path = os.path.join(generated_dir, mp3_filename)
    wav_path = os.path.join(generated_dir, wav_filename)
    lipsync_path = os.path.join(generated_dir, lipsync_filename)

    # 1. Generate TTS
    # tts = gTTS(text=response_text, lang='en')
    # tts.save(mp3_path)

    # =======================================================
    # == NEW: EDGE-TTS AUDIO GENERATION                    ==
    # =======================================================
    # Select high-quality neural voices based on the user's choice
    voice_id = "en-US-GuyNeural" if request.voice == "male" else "en-US-AriaNeural"
    
    print(f"Generating TTS for: '{response_text}' using voice: {voice_id}")
    
    # edge_tts is asynchronous, so we must 'await' it
    communicate = edge_tts.Communicate(response_text, voice_id)
    await communicate.save(mp3_path)
    # =======================================================
    
    # 2. Convert to WAV
    AudioSegment.from_mp3(mp3_path).export(wav_path, format="wav", parameters=["-ar", "16000"])

    # 3. Generate Lip Sync
    if create_lipsync_data(wav_path, lipsync_path):
        if os.path.exists(wav_path):
            os.remove(wav_path)
        return {
            "audioUrl": f"/generated/{mp3_filename}",
            "lipsyncUrl": f"/generated/{lipsync_filename}",
            "text": response_text
        }
    else:
        return {"error": "Failed to generate lip-sync data."}, 500

# --- Static File Serving (unchanged) ---
app.mount("/generated", StaticFiles(directory=os.path.join("..", "generated")), name="generated")
app.mount("/", StaticFiles(directory=os.path.join("..", "frontend"), html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8015)