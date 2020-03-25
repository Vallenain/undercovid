import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SuggestWordsComponent } from './suggest-words.component';

describe('SuggestWordsComponent', () => {
  let component: SuggestWordsComponent;
  let fixture: ComponentFixture<SuggestWordsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SuggestWordsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SuggestWordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
