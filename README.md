# CourseCompass AI 🎓

CourseCompass AI is an AI-powered college course recommendation chatbot that helps students explore suitable courses based on their educational background, interests, skills, and career goals.

## Features

- **AI Course Recommendations:** Get personalized course suggestions based on your questions.
- **Course Catalogue:** Browse available courses and view their details.
- **Retrieval-Augmented Generation (RAG):** Retrieves relevant course information from a course dataset to support recommendations.
- **Interactive Chatbot:** Ask questions about courses, eligibility, duration, fees, skills, and career opportunities.
- **Responsive Website:** Explore courses through a user-friendly Angular interface.

## Technologies Used

**Frontend**
- Angular
- TypeScript
- HTML
- CSS

**Backend**
- Python
- Django
- Django REST Framework

**AI and RAG**
- LangChain
- Google Gemini API
- Hugging Face Sentence Transformers
- FAISS
- Pandas

**Dataset**
- CSV

## How It Works

1. Students browse courses on the website or ask the chatbot a question.
2. The Angular frontend sends the request to the Django REST API.
3. The RAG system searches the course dataset for relevant information.
4. Gemini generates a response using the retrieved course information.
5. The chatbot displays the recommendation to the student.


## Important Notes

- AI chatbot responses require a valid Gemini API key and available API quota.
- Course catalogue data can be accessed separately from the AI chatbot.
- Recommendations depend on the available course dataset and retrieved information.
- Keep API keys and other secrets out of version control.



## Project Goal

CourseCompass AI aims to make course exploration easier by helping students discover educational opportunities aligned with their interests and career goals.