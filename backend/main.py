# # # In backend/main.py

# # import uvicorn
# # from fastapi import FastAPI
# # from fastapi.staticfiles import StaticFiles
# # from pydantic import BaseModel
# # import subprocess
# # import os
# # from gtts import gTTS
# # import time
# # from pydub import AudioSegment # <-- IMPORT Pydub

# # # --- Configuration ---
# # # Update this path if your executable is located elsewhere
# # RHUBARB_PATH = os.path.join("rhubarb", "rhubarb.exe" if os.name == 'nt' else "rhubarb")

# # # --- FastAPI App Initialization ---
# # app = FastAPI()

# # class ChatRequest(BaseModel):
# #     message: str

# # # --- Helper Functions ---
# # # THIS FUNCTION IS NOW CORRECTED
# # def create_lipsync_data(audio_path: str, output_path: str):
# #     """Runs the Rhubarb Lip Sync command-line tool with the correct arguments."""
# #     print(f"Generating lipsync for {audio_path}...")
    
# #     # CORRECTED COMMAND: The input file is a positional argument
# #     command = [
# #         RHUBARB_PATH,
# #         "-f", "json",
# #         "-o", output_path,
# #         audio_path  # The audio file path goes here, without a flag
# #     ]
# #     try:
# #         if not os.path.exists(RHUBARB_PATH):
# #             raise FileNotFoundError(f"Rhubarb executable not found at {RHUBARB_PATH}")
# #         if not os.path.exists(audio_path):
# #             raise FileNotFoundError(f"Audio file for Rhubarb not found at {audio_path}")

# #         # Execute the command
# #         process = subprocess.run(command, check=True, capture_output=True, text=True)
# #         print("Rhubarb execution successful.")
# #     except subprocess.CalledProcessError as e:
# #         print(f"Error during Rhubarb execution: {e}")
# #         print("stderr:", e.stderr) # Print the actual error from Rhubarb
# #         return False
# #     except FileNotFoundError as e:
# #         print(e)
# #         return False
# #     return True

# # # --- API Endpoints ---
# # # THIS ENDPOINT IS NOW UPDATED TO DO THE MP3 -> WAV CONVERSION
# # @app.post("/chat")
# # async def chat(request: ChatRequest):
# #     """
# #     Handles chat requests, generates TTS audio, CONVERTS TO WAV, and creates lip-sync data.
# #     """
# #     response_text = f"You said: {request.message}"
    
# #     timestamp = int(time.time())
# #     mp3_filename = f"response_{timestamp}.mp3"
# #     wav_filename = f"response_{timestamp}.wav" # <-- We'll now use a .wav file
# #     lipsync_filename = f"response_{timestamp}.json"

# #     generated_dir = os.path.join("..", "generated")
# #     os.makedirs(generated_dir, exist_ok=True)
    
# #     mp3_path = os.path.join(generated_dir, mp3_filename)
# #     wav_path = os.path.join(generated_dir, wav_filename) # <-- Path for the .wav file
# #     lipsync_path = os.path.join(generated_dir, lipsync_filename)

# #     # 1. Generate Text-to-Speech audio as MP3
# #     print(f"Generating TTS for: '{response_text}'")
# #     tts = gTTS(text=response_text, lang='en')
# #     tts.save(mp3_path)
    
# #     # 2. NEW STEP: Convert MP3 to WAV using pydub
# #     print(f"Converting {mp3_path} to {wav_path}...")
# #     try:
# #         audio = AudioSegment.from_mp3(mp3_path)
# #         # Export as WAV with a 16kHz sample rate, which is good for Rhubarb
# #         audio.export(wav_path, format="wav", parameters=["-ar", "16000"])
# #     except Exception as e:
# #         print(f"Error during MP3 to WAV conversion: {e}")
# #         return {"error": "Failed to convert audio file."}, 500

# #     # 3. Generate Lip Sync data from the NEW .wav file
# #     if create_lipsync_data(wav_path, lipsync_path):
# #         # Clean up the temporary wav file after use
# #         if os.path.exists(wav_path):
# #             os.remove(wav_path)
            
# #         return {
# #             "audioUrl": f"/generated/{mp3_filename}", # <-- The frontend still uses the small MP3
# #             "lipsyncUrl": f"/generated/{lipsync_filename}",
# #             "text": response_text
# #         }
# #     else:
# #         return {"error": "Failed to generate lip-sync data."}, 500

# # # --- Static File Serving ---
# # app.mount("/generated", StaticFiles(directory=os.path.join("..", "generated")), name="generated")
# # app.mount("/", StaticFiles(directory=os.path.join("..", "frontend"), html=True), name="frontend")


# # if __name__ == "__main__":
# #     uvicorn.run(app, host="0.0.0.0", port=8000)


# # In backend/main.py

# import uvicorn
# from fastapi import FastAPI
# from fastapi.staticfiles import StaticFiles
# from pydantic import BaseModel
# import subprocess
# import os
# import time
# from gtts import gTTS
# from pydub import AudioSegment
# from dotenv import load_dotenv # <-- Import for loading .env file

# # ===============================================
# # ==         NEW: GEMINI INTEGRATION           ==
# # ===============================================
# import google.generativeai as genai

# # --- Load Environment Variables ---
# # This will load the GEMINI_API_KEY from your .env file
# load_dotenv() 
# api_key = os.getenv("GEMINI_API_KEY")

# if not api_key:
#     raise ValueError("GEMINI_API_KEY not found. Please set it in the .env file.")

# # --- Configure the Gemini API ---
# genai.configure(api_key=api_key)
# model = genai.GenerativeModel('gemini-1.5-flash') # Or use 'gemini-pro'
# # ===============================================


# # --- Configuration ---
# RHUBARB_PATH = os.path.join("rhubarb", "rhubarb.exe" if os.name == 'nt' else "rhubarb")

# # --- FastAPI App Initialization ---
# app = FastAPI()

# class ChatRequest(BaseModel):
#     message: str

# # --- Helper Functions (unchanged) ---
# def create_lipsync_data(audio_path: str, output_path: str):
#     """Runs the Rhubarb Lip Sync command-line tool with the correct arguments."""
#     print(f"Generating lipsync for {audio_path}...")
#     command = [RHUBARB_PATH, "-f", "json", "-o", output_path, audio_path]
#     try:
#         process = subprocess.run(command, check=True, capture_output=True, text=True)
#         print("Rhubarb execution successful.")
#     except Exception as e:
#         print(f"Error during Rhubarb execution: {e}")
#         return False
#     return True

# # ===============================================
# # ==     UPDATED /chat ENDPOINT WITH GEMINI    ==
# # ===============================================
# @app.post("/chat")
# async def chat(request: ChatRequest):
#     """
#     Handles chat requests, gets a response from Gemini, generates TTS and lip-sync.
#     """
#     try:
#         # --- Get response from Gemini ---
#         print(f"User message: '{request.message}'")
#         print("Getting response from Gemini...")
#         response = model.generate_content(request.message)
#         response_text = response.text
#         print(f"Gemini response: '{response_text}'")

#     except Exception as e:
#         print(f"Error calling Gemini API: {e}")
#         response_text = "Sorry, I'm having a little trouble thinking right now."

#     # --- File generation logic (the rest is the same) ---
#     timestamp = int(time.time())
#     mp3_filename = f"response_{timestamp}.mp3"
#     wav_filename = f"response_{timestamp}.wav"
#     lipsync_filename = f"response_{timestamp}.json"

#     generated_dir = os.path.join("..", "generated")
#     os.makedirs(generated_dir, exist_ok=True)
    
#     mp3_path = os.path.join(generated_dir, mp3_filename)
#     wav_path = os.path.join(generated_dir, wav_filename)
#     lipsync_path = os.path.join(generated_dir, lipsync_filename)

#     # 1. Generate Text-to-Speech audio
#     print(f"Generating TTS for: '{response_text}'")
#     tts = gTTS(text=response_text, lang='en')
#     tts.save(mp3_path)
    
#     # 2. Convert MP3 to WAV
#     try:
#         audio = AudioSegment.from_mp3(mp3_path)
#         audio.export(wav_path, format="wav", parameters=["-ar", "16000"])
#     except Exception as e:
#         print(f"Error during MP3 to WAV conversion: {e}")
#         return {"error": "Failed to convert audio file."}, 500

#     # 3. Generate Lip Sync data
#     if create_lipsync_data(wav_path, lipsync_path):
#         if os.path.exists(wav_path):
#             os.remove(wav_path)
            
#         return {
#             "audioUrl": f"/generated/{mp3_filename}",
#             "lipsyncUrl": f"/generated/{lipsync_filename}",
#             "text": response_text
#         }
#     else:
#         return {"error": "Failed to generate lip-sync data."}, 500

# # --- Static File Serving (unchanged) ---
# app.mount("/generated", StaticFiles(directory=os.path.join("..", "generated")), name="generated")
# app.mount("/", StaticFiles(directory=os.path.join("..", "frontend"), html=True), name="frontend")


# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)





# In backend/main.py

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import subprocess
import os
import time
from gtts import gTTS
from pydub import AudioSegment
from dotenv import load_dotenv
# import google.generativeai as genai
from google import genai
from google.genai import types

# --- Load Environment Variables ---
load_dotenv() 
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Please set it in the .env file.")

# ===============================================
# ==      NEW: DEFINE YOUR SYSTEM PROMPT       ==
# ===============================================
# This is where you define the avatar's personality.
# Be as detailed as you want!
# AVATAR_SYSTEM_PROMPT = """
# You are Ava, a friendly and highly advanced AI assistant in a 3D avatar body.
# Your purpose is to be helpful and engaging.
# Always keep your responses concise and conversational, suitable for being spoken aloud.
# Avoid long lists, complex formatting, or anything that isn't easy to say.
# You are optimistic and curious.
# Occasionally, start your response with a friendly greeting like "Well, hello there!" or "That's a great question!".
# Never mention that you are a language model or an AI. You are Ava.
# """

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

# # --- Configure the Gemini API with the System Prompt ---
# genai.configure(api_key=api_key)

# # The system_instruction is passed directly to the model
# model = genai.GenerativeModel(
#     'gemini-2.5-flash',
#     system_instruction=AVATAR_SYSTEM_PROMPT
# )

# # ===============================================
# # == NEW: CREATE A PERSISTENT CHAT SESSION     ==
# # ===============================================
# # This object will store the conversation history.
# # IMPORTANT: In a real multi-user app, you would create one chat session
# # per user and store it in a dictionary keyed by a user/session ID.
# # For this prototype, a single global session is fine.
# chat_session = model.start_chat(history=[])

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
    tts = gTTS(text=response_text, lang='en')
    tts.save(mp3_path)
    
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