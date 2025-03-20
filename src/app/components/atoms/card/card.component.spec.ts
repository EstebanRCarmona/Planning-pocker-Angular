import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;
  let cardElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    cardElement = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('should apply overlay style if overlay is provided', () => {
    component.overlay = 'rgba(255, 0, 0, 0.5)';
    fixture.detectChanges();
    const cardStyle = cardElement.querySelector('.card')?.getAttribute('style');
    expect(cardStyle).toContain('background-color: rgba(255, 0, 0, 0.5)');
  });

  it('should not apply overlay style if overlay is null', () => {
    component.overlay = null;
    fixture.detectChanges();
    const cardStyle = cardElement.querySelector('.card')?.getAttribute('style');
    expect(cardStyle).toBeNull();
  });


  it('should return empty style when overlay is null in getOverlayStyle', () => {
    component.overlay = null;
    fixture.detectChanges();
    expect(component.getOverlayStyle()).toEqual({});
  });

  it('should return correct style when overlay is set in getOverlayStyle', () => {
    component.overlay = 'rgba(255, 0, 0, 0.5)';
    fixture.detectChanges();
    expect(component.getOverlayStyle()).toEqual({ 'background-color': 'rgba(255, 0, 0, 0.5)' });
  });
});
