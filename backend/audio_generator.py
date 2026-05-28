import os
import asyncio
import re
import edge_tts

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "audio")

VOICE_MALE = "en-US-GuyNeural"
VOICE_FEMALE = "en-US-JennyNeural"
VOICE_LECTURE = "en-US-GuyNeural"


async def _speak(text: str, voice: str, output_path: str) -> None:
    """Generate a single MP3 segment using edge-tts."""
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


async def _combine_mp3s(segments: list[bytes], output_path: str) -> None:
    """Concatenate raw MP3 frames. Simple append works for CBR MP3."""
    combined = b"".join(segments)
    with open(output_path, "wb") as f:
        f.write(combined)


async def generate_conversation_audio(transcript: str, output_path: str) -> str:
    """Generate audio for a conversation, alternating voices per speaker turn."""
    os.makedirs(AUDIO_DIR, exist_ok=True)

    # Split into speaker turns: lines like "Student:", "Professor:", "Librarian:"
    pattern = re.compile(r"^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?):\s*(.+)", re.MULTILINE)
    turns = pattern.findall(transcript)

    if not turns:
        # Fallback: treat as single-voice
        await _speak(transcript, VOICE_LECTURE, output_path)
        return output_path

    # Assign voices: first unique speaker gets male, second gets female, rest alternate
    seen_speakers: list[str] = []
    for speaker, _ in turns:
        if speaker not in seen_speakers:
            seen_speakers.append(speaker)

    segments: list[bytes] = []
    for speaker, line in turns:
        voice = VOICE_MALE if seen_speakers.index(speaker) % 2 == 0 else VOICE_FEMALE
        seg_path = os.path.join(AUDIO_DIR, f"_seg_{len(segments)}.mp3")
        await _speak(line, voice, seg_path)
        with open(seg_path, "rb") as f:
            segments.append(f.read())
        os.remove(seg_path)

    await _combine_mp3s(segments, output_path)
    return output_path


async def generate_lecture_audio(transcript: str, output_path: str) -> str:
    """Generate audio for a lecture using a single natural voice."""
    os.makedirs(AUDIO_DIR, exist_ok=True)
    await _speak(transcript, VOICE_LECTURE, output_path)
    return output_path


async def generate_audio(transcript: str, passage_type: str, passage_id: int) -> str:
    """Generate an MP3 audio file for a listening passage.

    Returns the relative URL path to the generated file.
    """
    filename = f"{passage_id}.mp3"
    output_path = os.path.join(AUDIO_DIR, filename)

    if passage_type == "conversation":
        await generate_conversation_audio(transcript, output_path)
    else:
        await generate_lecture_audio(transcript, output_path)

    return f"/audio/{filename}"
