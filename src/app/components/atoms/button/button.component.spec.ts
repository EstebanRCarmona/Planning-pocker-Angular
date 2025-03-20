import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;
  let button: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    button = fixture.debugElement.query(By.css('button'));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit onClick event when button is clicked and not disabled', () => {
    const spy = jest.spyOn(component.onClick, 'emit');

    button.triggerEventHandler('click', null);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not emit onClick event when button is disabled', () => {
    component.disabled = true;
    fixture.detectChanges();

    const spy = jest.spyOn(component.onClick, 'emit');

    button.triggerEventHandler('click', null);

    expect(spy).not.toHaveBeenCalled();
  });

  it('should apply the correct button classes', () => {
    expect(button.classes['custom-button']).toBeTruthy();

    component.customClass = 'my-custom-class';
    fixture.detectChanges();
    expect(button.classes['my-custom-class']).toBeTruthy();

    component.revealt = true;
    fixture.detectChanges();
    expect(button.classes['revealt-class']).toBeTruthy();
  });


  it('should have correct button type', () => {
    expect(button.nativeElement.type).toBe('button');

    component.type = 'submit';
    fixture.detectChanges();
    expect(button.nativeElement.type).toBe('submit');
  });
});
