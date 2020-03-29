import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EliminatedDialogComponent } from './eliminated-dialog.component';

describe('EliminatedDialogComponent', () => {
  let component: EliminatedDialogComponent;
  let fixture: ComponentFixture<EliminatedDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EliminatedDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EliminatedDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
