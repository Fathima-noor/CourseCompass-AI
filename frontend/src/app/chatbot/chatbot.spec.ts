import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { Chatbot } from './chatbot';

describe('Chatbot', () => {
  let component: Chatbot;
  let fixture: ComponentFixture<Chatbot>;
  let request: Subject<{ answer?: string; error?: string }>;
  let post: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    request = new Subject<{ answer?: string; error?: string }>();
    const httpMock = {
      post: vi.fn(() => request.asObservable())
    };
    post = httpMock.post;

    await TestBed.configureTestingModule({
      imports: [Chatbot],
    });
    TestBed.overrideComponent(Chatbot, {
      add: {
        providers: [
          { provide: HttpClient, useValue: httpMock }
        ]
      }
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(Chatbot);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stops loading after success and ignores duplicate sends', () => {
    component.question = 'Recommend a data course';

    component.sendMessage();
    component.sendMessage();

    expect(post).toHaveBeenCalledTimes(1);
    expect(component.loading).toBe(true);

    request.next({ answer: 'Consider MSc Data Science.' });
    request.complete();

    expect(component.loading).toBe(false);
    expect(component.messages).toContainEqual({
      role: 'user',
      text: 'Recommend a data course'
    });
    expect(component.messages.at(-1)).toEqual({
      role: 'bot',
      text: 'Consider MSc Data Science.'
    });
  });

  it('stops loading and preserves messages after an API failure', () => {
    component.question = 'Recommend a data course';
    component.sendMessage();

    request.error({
      status: 504,
      error: { error: 'The AI service took too long to respond.' }
    });

    expect(component.loading).toBe(false);
    expect(component.messages).toContainEqual({
      role: 'user',
      text: 'Recommend a data course'
    });
    expect(component.messages.at(-1)).toEqual({
      role: 'bot',
      text: 'The AI service took too long to respond.'
    });
  });
});
