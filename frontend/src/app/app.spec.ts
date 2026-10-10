import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { App } from './app';
import { Chatbot } from './chatbot/chatbot';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let courseGet: ReturnType<typeof vi.fn>;
  let chatPost: ReturnType<typeof vi.fn>;
  let chatRequest: Subject<{ answer?: string; error?: string }>;

  beforeEach(async () => {
    courseGet = vi.fn(() => of([{
      course_name: 'MSc Data Science',
      field: 'Data Science',
      level: 'Postgraduate',
      duration: '2 years',
      fees: 130000,
      eligibility: 'BSc Computer Science or Mathematics',
      skills: 'Python; SQL',
      career_options: 'Data Scientist',
      description: 'Study data science.'
    }]));
    chatRequest = new Subject();
    chatPost = vi.fn(() => chatRequest.asObservable());

    await TestBed.configureTestingModule({
      imports: [App],
    });
    TestBed.overrideComponent(App, {
      add: {
        providers: [
          { provide: HttpClient, useValue: { get: courseGet } }
        ]
      }
    });
    TestBed.overrideComponent(Chatbot, {
      add: {
        providers: [
          { provide: HttpClient, useValue: { post: chatPost } }
        ]
      }
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  it('links every navigation anchor to an existing section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      compiled.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
    );

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(
        compiled.querySelector(link.getAttribute('href')!)
      ).not.toBeNull();
    }
    expect(compiled.querySelector('h1')?.textContent)
      .toContain('Your future');
  });

  it('opens the deferred chatbot from Ask controls without toggling it closed', async () => {
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('.nav-cta')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.chat-window')).not.toBeNull();
    expect(
      compiled.querySelector('.chat-toggle')?.getAttribute('aria-expanded')
    ).toBe('true');

    compiled.querySelector<HTMLButtonElement>('.nav-cta')!.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.chat-window')).not.toBeNull();
    expect(
      compiled.querySelector('.chat-toggle')?.getAttribute('aria-expanded')
    ).toBe('true');
  });

  it('closes from both chatbot close controls and can reopen from the homepage', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    app.openAssistant();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    compiled.querySelector<HTMLButtonElement>('.close-button')!.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.chat-window')).toBeNull();

    compiled.querySelector<HTMLButtonElement>('.chat-toggle')!.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.chat-window')).not.toBeNull();

    compiled.querySelector<HTMLButtonElement>('.chat-toggle')!.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.chat-window')).toBeNull();

    compiled.querySelector<HTMLButtonElement>('.text-link')!.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.chat-window')).not.toBeNull();
  });

  it('prefills a course-specific question from the course Ask AI button', async () => {
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.course-action')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const input = compiled.querySelector<HTMLInputElement>(
      '.chat-form input'
    );
    expect(input?.value).toContain('MSc Data Science');
  });

  it('retries course loading through the retry control', () => {
    courseGet.mockImplementationOnce(() =>
      throwError(() => new Error('test connection failure'))
    );
    app.loadCourses();
    fixture.detectChanges();
    const requestsBeforeRetry = courseGet.mock.calls.length;

    expect(app.courseError).toContain('Unable to load courses');
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.error-message button')!
      .click();
    fixture.detectChanges();

    expect(courseGet).toHaveBeenCalledTimes(requestsBeforeRetry + 1);
    expect(app.courseError).toBe('');
    expect(app.loadingCourses).toBe(false);
  });
});
