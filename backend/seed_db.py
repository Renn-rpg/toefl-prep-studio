"""Run once to populate the database with sample content."""
import json
from sqlmodel import Session
from database import engine, create_db_and_tables
from models import ListeningPassage, ReadingPassage, SpeakingPrompt, WritingPrompt


def seed():
    create_db_and_tables()
    with Session(engine) as session:
        # ── Listening passages (6 total) ──
        listening_passages = [
            ListeningPassage(
                title="The History of Jazz Music",
                audio_url="",
                transcript="Jazz music originated in New Orleans in the late 19th and early 20th centuries. It combined African rhythms with European harmonic structures, creating a unique American art form. Key figures like Louis Armstrong and Duke Ellington helped popularize jazz worldwide. The genre is characterized by improvisation, syncopation, and swing rhythm. Over the decades, jazz evolved into many sub-genres including bebop, cool jazz, and fusion.",
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
                transcript="Student: Excuse me, I heard the library is changing its hours. Is that true? Librarian: Yes, starting next Monday, the library will be open from 7 AM to midnight on weekdays. On weekends, we'll open at 9 AM and close at 10 PM. Student: That's great! The later closing time will really help during finals. Librarian: Exactly, and we're also adding 20 new study rooms on the third floor.",
                difficulty="easy",
                passage_type="conversation",
                questions_json=json.dumps([
                    {"id": 1, "question": "What is the new weekday closing time?", "options": ["10 PM", "11 PM", "Midnight", "1 AM"], "answer": "Midnight", "explanation": "The librarian says the library will close at midnight on weekdays."},
                    {"id": 2, "question": "What additional facility is being added?", "options": ["Computer lab", "Coffee shop", "Study rooms", "Printing center"], "answer": "Study rooms", "explanation": "The librarian mentions 20 new study rooms."},
                ]),
            ),
            ListeningPassage(
                title="Plate Tectonics and Continental Drift",
                audio_url="",
                transcript="Today we'll discuss plate tectonics, the theory that explains how the Earth's surface is divided into several large plates that move slowly over time. Alfred Wegener first proposed the idea of continental drift in 1912, suggesting that all continents were once joined in a supercontinent called Pangaea. Evidence supporting this theory includes the matching coastlines of South America and Africa, similar fossil records on both continents, and identical rock formations found on opposite sides of the Atlantic Ocean. The movement of these plates causes earthquakes, volcanic activity, and the formation of mountain ranges.",
                difficulty="hard",
                passage_type="lecture",
                questions_json=json.dumps([
                    {"id": 1, "question": "Who first proposed the theory of continental drift?", "options": ["Charles Darwin", "Alfred Wegener", "Isaac Newton", "Albert Einstein"], "answer": "Alfred Wegener", "explanation": "Alfred Wegener proposed continental drift in 1912."},
                    {"id": 2, "question": "What was the name of the supercontinent?", "options": ["Gondwana", "Laurasia", "Pangaea", "Rodinia"], "answer": "Pangaea", "explanation": "The passage names it Pangaea."},
                    {"id": 3, "question": "Which is NOT mentioned as evidence for continental drift?", "options": ["Matching coastlines", "Similar fossils", "Ocean currents", "Rock formations"], "answer": "Ocean currents", "explanation": "Ocean currents are not mentioned as evidence."},
                    {"id": 4, "question": "What does plate movement cause?", "options": ["Climate change only", "Earthquakes and volcanic activity", "Ocean evaporation", "Seasonal changes"], "answer": "Earthquakes and volcanic activity", "explanation": "The passage lists earthquakes, volcanic activity, and mountain formation."},
                ]),
            ),
            ListeningPassage(
                title="Student Housing Application",
                audio_url="",
                transcript="Student: Hi, I'm calling about the housing application for next semester. I submitted mine two weeks ago but haven't heard back. Administrator: Let me check. What's your student ID? Student: It's 20231045. Administrator: I see your application here. Unfortunately, the dormitory you selected is already full. However, we have openings in the new residence hall on Oak Street. It's slightly more expensive, about fifty dollars more per month, but it includes a meal plan. Student: That actually sounds better. Can I switch my application? Administrator: Of course, I'll update it right now. You should receive a confirmation email within 48 hours.",
                difficulty="easy",
                passage_type="conversation",
                questions_json=json.dumps([
                    {"id": 1, "question": "Why hasn't the student received a response?", "options": ["Application was lost", "Selected dormitory is full", "Payment wasn't received", "Deadline was missed"], "answer": "Selected dormitory is full", "explanation": "The administrator says the selected dormitory is already full."},
                    {"id": 2, "question": "How much more expensive is the alternative?", "options": ["$30/month", "$50/month", "$75/month", "$100/month"], "answer": "$50/month", "explanation": "About fifty dollars more per month is stated."},
                    {"id": 3, "question": "What additional benefit does the new residence hall offer?", "options": ["Free parking", "A meal plan", "Larger rooms", "Private bathroom"], "answer": "A meal plan", "explanation": "It includes a meal plan."},
                ]),
            ),
            ListeningPassage(
                title="The Water Cycle and Climate",
                audio_url="",
                transcript="The water cycle, also known as the hydrological cycle, describes the continuous movement of water on, above, and below the Earth's surface. It begins with evaporation, where the sun heats water in oceans, lakes, and rivers, turning it into water vapor. This vapor rises into the atmosphere and cools, forming clouds through a process called condensation. When cloud droplets combine and become heavy enough, precipitation occurs in the form of rain, snow, or hail. Some of this water flows into rivers and streams as runoff, while some seeps into the ground as groundwater. Eventually, all water returns to the oceans, and the cycle repeats.",
                difficulty="medium",
                passage_type="lecture",
                questions_json=json.dumps([
                    {"id": 1, "question": "What is the first step in the water cycle described in the lecture?", "options": ["Condensation", "Precipitation", "Evaporation", "Runoff"], "answer": "Evaporation", "explanation": "The lecture says the cycle begins with evaporation."},
                    {"id": 2, "question": "What causes condensation?", "options": ["Wind", "Cooling of water vapor", "Gravity", "Sunlight"], "answer": "Cooling of water vapor", "explanation": "Vapor rises and cools, forming clouds."},
                    {"id": 3, "question": "What is water that seeps into the ground called?", "options": ["Runoff", "Precipitation", "Groundwater", "Condensation"], "answer": "Groundwater", "explanation": "The passage refers to it as groundwater."},
                ]),
            ),
            ListeningPassage(
                title="Academic Advisor Meeting",
                audio_url="",
                transcript="Student: Professor Chen, I'm struggling to decide between majoring in biology and environmental science. What do you recommend? Advisor: Well, they share many foundational courses. In your first two years, you'll take chemistry, statistics, and introductory biology regardless of which major you choose. The key difference is that biology focuses more on cellular and molecular processes, while environmental science takes a broader, interdisciplinary approach including ecology, geology, and policy. Student: I'm really interested in conservation work after graduation. Advisor: Then environmental science might be the better fit. It also offers more fieldwork opportunities and internships with conservation organizations.",
                difficulty="medium",
                passage_type="conversation",
                questions_json=json.dumps([
                    {"id": 1, "question": "What courses are shared between both majors?", "options": ["Physics and math", "Chemistry, statistics, and biology", "English and history", "Computer science and math"], "answer": "Chemistry, statistics, and biology", "explanation": "Chemistry, statistics, and introductory biology are shared."},
                    {"id": 2, "question": "What is the student's career interest?", "options": ["Medical research", "Teaching", "Conservation work", "Pharmaceutical industry"], "answer": "Conservation work", "explanation": "The student says they're interested in conservation work."},
                    {"id": 3, "question": "Why does the advisor recommend environmental science?", "options": ["Higher salary", "Easier coursework", "Fieldwork and internships", "Fewer requirements"], "answer": "Fieldwork and internships", "explanation": "Environmental science offers more fieldwork and internship opportunities."},
                ]),
            ),
        ]

        # ── Reading passages (3 total) ──
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
            ReadingPassage(
                title="The Industrial Revolution",
                content="The Industrial Revolution, which began in Britain in the late 18th century, fundamentally transformed the way goods were produced and how people lived. Before industrialization, most products were made by hand in small workshops or homes. The introduction of machines, powered first by water and then by steam, enabled mass production in factories. Key inventions such as the spinning jenny, the power loom, and the steam engine dramatically increased productivity. The revolution also brought significant social changes. Large numbers of people migrated from rural areas to cities in search of factory work, leading to rapid urbanization. Working conditions in early factories were often harsh, with long hours, low wages, and dangerous environments. Child labor was widespread. Over time, reform movements and labor unions emerged to advocate for workers' rights, leading to legislation that improved conditions. The Industrial Revolution spread from Britain to other parts of Europe and North America throughout the 19th century, laying the foundation for the modern industrial economy.",
                difficulty="medium",
                questions_json=json.dumps([
                    {"id": 1, "question": "Where did the Industrial Revolution begin?", "options": ["France", "Germany", "Britain", "United States"], "answer": "Britain", "explanation": "The passage states it began in Britain."},
                    {"id": 2, "question": "What replaced hand production?", "options": ["Robots", "Machines in factories", "Imported goods", "Government programs"], "answer": "Machines in factories", "explanation": "Machines enabled mass production in factories."},
                    {"id": 3, "question": "What social change resulted from industrialization?", "options": ["Population decline", "Urbanization", "Less trade", "Agricultural expansion"], "answer": "Urbanization", "explanation": "People migrated to cities, leading to rapid urbanization."},
                    {"id": 4, "question": "What advocated for workers' rights?", "options": ["Factory owners", "The government", "Reform movements and labor unions", "Foreign countries"], "answer": "Reform movements and labor unions", "explanation": "Reform movements and labor unions emerged for workers' rights."},
                    {"id": 5, "question": "Which invention is NOT mentioned in the passage?", "options": ["Spinning jenny", "Power loom", "Telegraph", "Steam engine"], "answer": "Telegraph", "explanation": "The telegraph is not mentioned in the passage."},
                ]),
                vocab_highlights_json=json.dumps([
                    {"word": "industrialization", "definition": "The process of developing industries in a country on a wide scale"},
                    {"word": "urbanization", "definition": "The process of making an area more urban; migration to cities"},
                    {"word": "productivity", "definition": "The effectiveness of productive effort, measured in output"},
                    {"word": "legislation", "definition": "Laws enacted by a legislative body"},
                    {"word": "advocacy", "definition": "Public support for a particular cause or policy"},
                ]),
            ),
            ReadingPassage(
                title="Coral Reef Ecosystems",
                content="Coral reefs are among the most biologically diverse ecosystems on Earth, often referred to as the rainforests of the sea. They are formed by colonies of tiny animals called coral polyps, which secrete calcium carbonate to create hard, protective skeletons. Over thousands of years, these skeletons build up to form the complex structures we recognize as reefs. Coral reefs support an estimated 25 percent of all marine species, despite covering less than one percent of the ocean floor. They provide critical habitats for fish, invertebrates, and algae. Many coastal communities depend on reefs for food, tourism revenue, and protection from storm surges. However, coral reefs face serious threats. Rising ocean temperatures cause coral bleaching, a process in which stressed corals expel the symbiotic algae living in their tissues, turning white and often dying. Ocean acidification, caused by increased carbon dioxide absorption, weakens coral skeletons. Pollution, overfishing, and destructive fishing practices also contribute to reef degradation. Scientists estimate that nearly half of the world's coral reefs have been lost in the past 30 years.",
                difficulty="hard",
                questions_json=json.dumps([
                    {"id": 1, "question": "What are coral reefs compared to?", "options": ["Deserts", "Rainforests of the sea", "Mountain ranges", "Arctic tundra"], "answer": "Rainforests of the sea", "explanation": "The passage calls them 'the rainforests of the sea.'"},
                    {"id": 2, "question": "What do coral polyps secrete?", "options": ["Silicon", "Calcium carbonate", "Iron oxide", "Sodium chloride"], "answer": "Calcium carbonate", "explanation": "Coral polyps secrete calcium carbonate for their skeletons."},
                    {"id": 3, "question": "What percentage of marine species do reefs support?", "options": ["10%", "25%", "50%", "75%"], "answer": "25%", "explanation": "An estimated 25 percent of all marine species."},
                    {"id": 4, "question": "What is coral bleaching?", "options": ["A natural growth process", "Corals expelling symbiotic algae", "Corals changing color seasonally", "A cleaning method"], "answer": "Corals expelling symbiotic algae", "explanation": "Stressed corals expel symbiotic algae, turning white."},
                    {"id": 5, "question": "What fraction of coral reefs has been lost recently?", "options": ["One quarter", "One third", "Nearly half", "Two thirds"], "answer": "Nearly half", "explanation": "Nearly half have been lost in the past 30 years."},
                ]),
                vocab_highlights_json=json.dumps([
                    {"word": "polyps", "definition": "Small, simple organisms that form coral colonies"},
                    {"word": "symbiotic", "definition": "A close, long-term interaction between two different species"},
                    {"word": "bleaching", "definition": "Loss of color in coral due to stress, often from warm water"},
                    {"word": "acidification", "definition": "The process of becoming more acidic, especially in oceans"},
                    {"word": "degradation", "definition": "The process of declining in quality or condition"},
                    {"word": "invertebrates", "definition": "Animals without a backbone, like crabs and jellyfish"},
                ]),
            ),
        ]

        # ── Speaking prompts (6 total) ──
        speaking_prompts = [
            SpeakingPrompt(task_type="independent", prompt="Do you prefer studying alone or with others? Use specific reasons and examples to support your answer."),
            SpeakingPrompt(task_type="independent", prompt="Describe a person who has had a significant influence on your life. Explain why this person has been important to you."),
            SpeakingPrompt(task_type="integrated", prompt="The university is considering eliminating the foreign language requirement for graduation. Discuss the advantages and disadvantages of this proposal."),
            SpeakingPrompt(task_type="independent", prompt="Some people prefer to live in a big city, while others prefer a small town. Which do you prefer and why?"),
            SpeakingPrompt(task_type="independent", prompt="Talk about a skill you would like to learn in the future. Explain why this skill is important to you."),
            SpeakingPrompt(task_type="integrated", prompt="The professor discusses the concept of neuroplasticity. Summarize the main points and explain how they relate to learning."),
        ]

        # ── Writing prompts (6 total) ──
        writing_prompts = [
            WritingPrompt(task_type="independent", prompt="Do you agree or disagree with the following statement? Technology has made people's lives more complicated than it has made them easier. Use specific reasons and examples to support your answer. Write at least 300 words."),
            WritingPrompt(task_type="independent", prompt="Some people believe that universities should focus on practical skills for employment, while others think universities should provide broader education. Discuss both views and give your opinion. Write at least 300 words."),
            WritingPrompt(task_type="integrated", prompt="Summarize the points made in the lecture, being sure to explain how they cast doubt on the specific points made in the reading passage. Write at least 150 words."),
            WritingPrompt(task_type="independent", prompt="Do you agree or disagree? Students should be required to take physical education courses throughout their university years. Use specific reasons and details to support your answer. Write at least 300 words."),
            WritingPrompt(task_type="independent", prompt="Some people think that the best way to learn is through making mistakes. Others believe that careful planning prevents errors and leads to success. Which view do you agree with? Write at least 300 words."),
            WritingPrompt(task_type="integrated", prompt="The reading passage presents arguments in favor of renewable energy. The lecture challenges these arguments. Summarize the points made in the lecture and explain how they respond to the reading. Write at least 150 words."),
        ]

        for item in listening_passages + reading_passages + speaking_prompts + writing_prompts:
            session.add(item)
        session.commit()

    print("Seed data inserted successfully.")
    print(f"  Listening: {len(listening_passages)} passages")
    print(f"  Reading:   {len(reading_passages)} passages")
    print(f"  Speaking:  {len(speaking_prompts)} prompts")
    print(f"  Writing:   {len(writing_prompts)} prompts")


if __name__ == "__main__":
    seed()
