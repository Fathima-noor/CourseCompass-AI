
import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpClientModule
} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

interface ChatResponse {
  answer?: string;
  error?: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Chatbot implements OnInit {
  @Input() initiallyOpen = false;
  @Input() initialQuestion = '';

  isOpen = false;
  question = '';
  loading = false;

  messages: ChatMessage[] = [
    {
      role: 'bot',
      text: 'Hi! Welcome to CourseCompass AI. Tell me about your education or career goal, and I will help you explore suitable courses.'
    }
  ];

  private readonly apiUrl =
    'http://127.0.0.1:8000/api/chat/';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isOpen = this.initiallyOpen;
    this.question = this.initialQuestion;
  }

  openChat(question?: string): void {
    this.isOpen = true;
    if (question) {
      this.question = question;
    }
    this.cdr.markForCheck();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    const question = this.question.trim();

    if (!question || this.loading) {
      return;
    }

    this.messages.push({
      role: 'user',
      text: question
    });

    this.question = '';
    this.loading = true;

    this.http.post<ChatResponse>(
      this.apiUrl,
      { question }
    ).pipe(
      timeout(120000),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        console.log('Chatbot API response:', response);

        const answer = response?.answer;

        let answerText: string;

        if (typeof answer === 'string') {
          answerText = answer;
        } else if (typeof response?.error === 'string') {
          answerText = response.error;
        } else {
          answerText =
            'The server responded, but no valid answer was received.';
        }

        this.messages.push({
          role: 'bot',
          text: answerText
        });

        this.cdr.markForCheck();
      },

      error: (error) => {
        console.error('Chatbot API error:', error);

        let errorMessage =
          'Unable to get a response. Please try again.';

        if (error.name === 'TimeoutError') {
          errorMessage =
            'The request took too long. Please try again.';
        } else if (error.status === 0) {
          errorMessage =
            'Could not connect to the chatbot service. Please try again.';
        } else if (
          typeof error.error?.error === 'string'
        ) {
          errorMessage = error.error.error;
        } else if (error.status === 504) {
          errorMessage =
            'The AI service took too long to respond. Please try again.';
        } else if (error.status >= 500) {
          errorMessage =
            'The AI service is temporarily unavailable. Please try again.';
        }

        this.messages.push({
          role: 'bot',
          text: errorMessage
        });

        this.cdr.markForCheck();
      }
    });
  }
}
