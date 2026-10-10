
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import { Chatbot } from './chatbot/chatbot';

interface ChatbotHandle {
  openChat(question?: string): void;
}

interface CourseData {
  course_name: string;
  field: string;
  level: string;
  duration: string;
  fees: string | number;
  eligibility: string;
  skills: string;
  career_options: string;
  description: string;
}

interface Course extends CourseData {
  icon: string;
  indexLabel: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, Chatbot],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  @ViewChild('chatbot') chatbot?: ChatbotHandle;

  courses: Course[] = [];
  loadingCourses = true;
  courseError = '';
  chatbotRequested = false;
  chatbotInitialQuestion = '';

  private readonly coursesApi =
    'http://127.0.0.1:8000/api/courses/';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loadingCourses = true;
    this.courseError = '';

    this.http.get<CourseData[]>(this.coursesApi).subscribe({
      next: (data) => {
        this.courses = data.map((course, index) => ({
          ...course,
          icon: this.getCourseIcon(course),
          indexLabel: `COURSE / ${String(index + 1).padStart(2, '0')}`
        }));
        this.loadingCourses = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Unable to load courses:', error);
        this.courseError =
          'Unable to load courses. Please check the backend server.';
        this.loadingCourses = false;
        this.cdr.markForCheck();
      }
    });
  }

  openAssistant(question?: string): void {
    this.chatbotRequested = true;
    this.chatbotInitialQuestion = question ?? '';
    this.cdr.markForCheck();

    if (this.chatbot) {
      this.chatbot.openChat(question);
    }
  }

  private getCourseIcon(course: CourseData): string {
    const text = (
      course.course_name + ' ' + course.field
    ).toLowerCase();

    if (text.includes('artificial intelligence')) return '✦';
    if (text.includes('data science')) return '◈';
    if (text.includes('cyber security')) return '⬡';
    if (text.includes('computer science')) return '⌘';
    if (text.includes('full stack') || text.includes('mca')) return '⌘';
    if (text.includes('machine learning')) return '◎';
    if (text.includes('cloud')) return '☁';
    if (text.includes('design')) return '✎';
    if (text.includes('analytics')) return '▥';

    return '✧';
  }
}
