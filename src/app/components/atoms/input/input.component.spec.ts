import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputAtomComponent } from './input.component';

describe('InputAtomComponent', () => {
  let component: InputAtomComponent;
  let fixture: ComponentFixture<InputAtomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InputAtomComponent ],
      imports: [
        FormsModule,
        ReactiveFormsModule
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InputAtomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set input value', () => {
    const testValue = 'Test Input';
    component.writeValue(testValue);

    expect(component.inputValue).toBe(testValue);
  });

  it('should emit value changes', () => {
    const valueChangedSpy = jest.spyOn(component.valueChanged, 'emit');
    const onChangeSpy = jest.spyOn(component, 'onChange');

    component.inputValue = 'New Value';
    component.onInputChange();

    expect(valueChangedSpy).toHaveBeenCalledWith('New Value');
    expect(onChangeSpy).toHaveBeenCalledWith('New Value');
  });

  it('should register change and touch handlers', () => {
    const changeFn = jest.fn();
    const touchFn = jest.fn();

    component.registerOnChange(changeFn);
    component.registerOnTouched(touchFn);

    component.onChange('Test');
    component.onTouched();

    expect(changeFn).toHaveBeenCalledWith('Test');
  });


});
