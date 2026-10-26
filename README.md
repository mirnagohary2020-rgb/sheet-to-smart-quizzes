# Sheet To Smart Quizzes

Build a web app called "QuizForge" that turns uploaded practice sheets into interactive one-question-at-a-time quizzes.



UPLOAD

- Drag-and-drop upload for PDF, DOCX, images (JPG/PNG of scanned sheets), and plain text.

- Use OCR for images/scanned PDFs.

- Send extracted text to an AI model that detects and splits individual questions, returning JSON:

  {question, type (MCQ / true-false / short answer / fill-in-blank), options[], correct_answer, explanation, topic, difficulty}

- If the sheet has no answer key, the AI generates the answer and explanation, flagged "AI-generated answer – verify".

- Show a review screen where I can edit, delete, reorder, or merge questions before saving.



QUIZ MODE

- One question per screen, large readable card, progress bar ("Question 4 of 25").

- Instant feedback after each answer: green/red highlight, correct answer, short explanation.

- Options: shuffle questions, shuffle choices, timer per question or whole quiz, "flag for review" button.

- Keyboard shortcuts (1–4 to pick, Enter for next) and swipe navigation on mobile.



AFTER THE QUIZ

- Score summary with % correct, time taken, and breakdown by topic.

- "Retry wrong answers only" button.

- Spaced-repetition mode: questions I got wrong reappear more often in later sessions.



LIBRARY

- Dashboard listing all uploaded sheets as quiz decks with title, question count, last score, and best score.

- Tags/folders by subject (e.g., Biology, Chemistry, Physics).

- Search across all questions.

- Combine multiple decks into one mixed quiz.



TOUCHES

- Streak counter and daily goal ("10 questions today").

- Confetti on 100% scores, subtle sound effects (toggleable).

- Light/dark mode, clean modern design, rounded cards, smooth transitions.

- Bilingual support (English/Arabic with RTL layout).

- Export a deck to PDF or share it via link.

- Progress chart showing scores over time.



TECH

- Mobile-first responsive design.

- Save decks and progress per user (simple email login or local storage).

- Fast loading; process uploads with a loading animation showing "Extracting questions…".

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f7e126cb-1b49-500d-a97e-76ec92ccd266).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
