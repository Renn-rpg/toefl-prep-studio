"""Run once to populate the database with sample content."""
import json
from sqlmodel import Session
from database import engine, create_db_and_tables
from models import ListeningPassage, ReadingPassage, SpeakingPrompt, WritingPrompt


def seed():
    create_db_and_tables()
    with Session(engine) as session:
        # Listening passages
        listening_passages = [
            ListeningPassage(
                title="The History of Jazz Music",
                audio_url="",
                transcript="Jazz music originated in New Orleans in the late 19th and early 20th centuries. It combined African rhythms with European harmonic structures, creating a unique American art form. Key figures like Louis Armstrong and Duke Ellington helped popularize jazz worldwide. The genre is characterized by improvisation, syncopation, and swing rhythm.",
                difficulty="medium",
                passage_type="lecture",
                questions_json=json.dumps([
                    {"id": 1, "question": "Where did jazz music originate?", "options": ["New York", "New Orleans", "Chicago", "Detroit"], "answer": "New Orleans", "explanation": "The passage states jazz originated in New Orleans."},
                    {"id": 2, "question": "What is a key characteristic of jazz?", "options": ["Strict tempo", "Improvisation", "Classical structure", "Simple melodies"], "answer": "Improvisation", "explanation": "Improvisation is listed as a key characteristic."},
                    {"id": 3, "question": "Which musician is mentioned as popularizing jazz?", "options": ["Miles Davis", "John Coltrane", "Louis Armstrong", "Charlie Parker"], "answer": "Louis Armstrong", "explanation": "Louis Armstrong is explicitly mentioned."},
                ]),
            ),
            ListeningPassage(
                title="Campus Library Hours Change",
                audio_url="",
                transcript="Student: Excuse me, I heard the library is changing its hours. Is that true? Librarian: Yes, starting next Monday, the library will be open from 7 AM to midnight on weekdays. On weekends, we'll open at 9 AM and close at 10 PM. Student: That's great! The later closing time will really help during finals. Librarian: Exactly, and we're also adding 20 new study rooms.",
                difficulty="easy",
                passage_type="conversation",
                questions_json=json.dumps([
                    {"id": 1, "question": "What is the new weekday closing time?", "options": ["10 PM", "11 PM", "Midnight", "1 AM"], "answer": "Midnight", "explanation": "The librarian says the library will close at midnight on weekdays."},
                    {"id": 2, "question": "What additional facility is being added?", "options": ["Computer lab", "Coffee shop", "Study rooms", "Printing center"], "answer": "Study rooms", "explanation": "The librarian mentions 20 new study rooms."},
                ]),
            ),
        ]

        # Reading passages
        reading_passages = [
            ReadingPassage(
                title="Photosynthesis and Plant Energy",
                content="Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose. This process occurs primarily in the chloroplasts, organelles containing the green pigment chlorophyll. During photosynthesis, plants absorb carbon dioxide from the air and water from the soil. Using light energy, they convert these raw materials into glucose and oxygen. The oxygen is released into the atmosphere as a byproduct, which is essential for most life on Earth. Photosynthesis can be divided into two stages: the light-dependent reactions and the Calvin cycle. The light-dependent reactions occur in the thylakoid membranes and capture energy from sunlight. The Calvin cycle takes place in the stroma and uses this captured energy to synthesize glucose from carbon dioxide.",
                difficulty="medium",
                questions_json=json.dumps([
                    {"id": 1, "question": "Where does photosynthesis primarily occur?", "options": ["Mitochondria", "Nucleus", "Chloroplasts", "Cell membrane"], "answer": "Chloroplasts", "explanation": "The passage states photosynthesis occurs in chloroplasts."},
                    {"id": 2, "question": "What is released as a byproduct of photosynthesis?", "options": ["Carbon dioxide", "Glucose", "Water", "Oxygen"], "answer": "Oxygen", "explanation": "Oxygen is released as a byproduct."},
                    {"id": 3, "question": "Where do the light-dependent reactions occur?", "options": ["Stroma", "Thylakoid membranes", "Cytoplasm", "Cell wall"], "answer": "Thylakoid membranes", "explanation": "The passage explicitly states this."},
                    {"id": 4, "question": "What does the Calvin cycle produce?", "options": ["Oxygen", "ATP", "Glucose", "Chlorophyll"], "answer": "Glucose", "explanation": "The Calvin cycle synthesizes glucose."},
                ]),
                vocab_highlights_json=json.dumps([
                    {"word": "photosynthesis", "definition": "The process by which plants make food from sunlight"},
                    {"word": "chloroplasts", "definition": "Organelles in plant cells where photosynthesis occurs"},
                    {"word": "chlorophyll", "definition": "The green pigment that captures light energy"},
                    {"word": "glucose", "definition": "A simple sugar that stores chemical energy"},
                    {"word": "thylakoid", "definition": "Membrane structures inside chloroplasts"},
                ]),
            ),
        ]

        # Speaking prompts
        speaking_prompts = [
            SpeakingPrompt(task_type="independent", prompt="Do you prefer studying alone or with others? Use specific reasons and examples to support your answer."),
            SpeakingPrompt(task_type="independent", prompt="Describe a person who has had a significant influence on your life. Explain why this person has been important to you."),
            SpeakingPrompt(task_type="integrated", prompt="The university is considering eliminating the foreign language requirement for graduation. Discuss the advantages and disadvantages of this proposal."),
        ]

        # Writing prompts
        writing_prompts = [
            WritingPrompt(task_type="independent", prompt="Do you agree or disagree with the following statement? Technology has made people's lives more complicated than it has made them easier. Use specific reasons and examples to support your answer. Write at least 300 words."),
            WritingPrompt(task_type="independent", prompt="Some people believe that universities should focus on practical skills for employment, while others think universities should provide broader education. Discuss both views and give your opinion. Write at least 300 words."),
            WritingPrompt(task_type="integrated", prompt="Summarize the points made in the lecture, being sure to explain how they cast doubt on the specific points made in the reading passage. Write at least 150 words."),
        ]

        for item in listening_passages + reading_passages + speaking_prompts + writing_prompts:
            session.add(item)
        session.commit()

    print("Seed data inserted successfully.")


if __name__ == "__main__":
    seed()
