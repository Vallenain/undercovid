import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AreyousureDialogComponent } from './areyousure-dialog.component';

describe('AreyousureDialogComponent', () => {
  let component: AreyousureDialogComponent;
  let fixture: ComponentFixture<AreyousureDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AreyousureDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AreyousureDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
