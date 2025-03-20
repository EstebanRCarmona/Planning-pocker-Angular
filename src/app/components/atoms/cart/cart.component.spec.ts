import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CartComponent } from './cart.component';
import { By } from '@angular/platform-browser';

describe('CartComponent', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;
  let cartElement: HTMLElement;
  let cardSelectedSpy: jest.Mock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    cartElement = fixture.nativeElement;

    cardSelectedSpy = jest.fn();
    component.cardSelected.subscribe(cardSelectedSpy);

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit cardSelected when card is clicked and not disabled', () => {
    component.number = 1;
    component.disabled = false;
    fixture.detectChanges();

    const cartElement = fixture.nativeElement.querySelector('.cart') as HTMLElement;

    cartElement.click();

    expect(cardSelectedSpy).toHaveBeenCalledWith(1);
  });

  it('should display number correctly when input is provided', () => {
    component.number = 2;
    fixture.detectChanges();

    const cartElement = fixture.debugElement.query(By.css('.cart'));
    const numberElement = cartElement.query(By.css('.number'));

    expect(numberElement.nativeElement.textContent).toBe('2');
  });


  it('should not apply the isVoted input when false', () => {
    component.isVoted = false;
    fixture.detectChanges();
    const votedElement = cartElement.querySelector('.cart-voted');
    expect(votedElement).toBeNull();
  });
});
