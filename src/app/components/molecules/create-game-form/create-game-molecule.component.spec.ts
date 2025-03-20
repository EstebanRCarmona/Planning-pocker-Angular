import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CreateGameFormComponent } from './create-game-molecule.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { NAME_LENGHT, NAME_REQUIERED } from 'src/app/shared/Constants';

@Component({
  selector: 'app-input-atom',
  template: `
    <div>
      <label>{{ title }}</label>
      <input
        [value]="value"
        (input)="onInputChange($event)"
        [placeholder]="placeholder"
      >
      <div *ngIf="error" class="error-message">{{ errorMessage }}</div>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MockInputAtomComponent),
      multi: true
    }
  ]
})
class MockInputAtomComponent implements ControlValueAccessor {
  @Input() title: string = '';
  @Input() placeholder: string = '';
  @Input() error: boolean = false;
  @Input() errorMessage: string = '';

  value: string = '';

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
    this.onTouched();
  }
}

describe('CreateGameFormComponent', () => {
  let component: CreateGameFormComponent;
  let fixture: ComponentFixture<CreateGameFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        CreateGameFormComponent,
        ButtonComponent,
        MockInputAtomComponent
      ],
      imports: [
        ReactiveFormsModule,
        FormsModule
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateGameFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function validateGameName(name: string, expectedErrors: string[] = []) {
    const nameControl = component.gameForm.get('name');
    nameControl?.setValue(name);

    expectedErrors.forEach(errorKey => {
      expect(nameControl?.hasError(errorKey)).toBeTruthy();
    });

    if (expectedErrors.length === 0) {
      expect(nameControl?.valid).toBeTruthy();
    }
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty name', () => {
    expect(component.gameForm.get('name')?.value).toBe('');
  });

  it('should emit create game event when form is valid', () => {
    const createGameSpy = jest.spyOn(component.createGame, 'emit');
    const nameControl = component.gameForm.get('name');

    nameControl?.setValue('Partida Válida');
    component.onSubmit();

    expect(createGameSpy).toHaveBeenCalledWith({
      name: 'Partida Válida'
    });
  });

  it('should not emit create game event when form is invalid', () => {
    const createGameSpy = jest.spyOn(component.createGame, 'emit');
    const nameControl = component.gameForm.get('name');

    nameControl?.setValue('');
    component.onSubmit();

    expect(createGameSpy).not.toHaveBeenCalled();
  });


  it('should validate name length between 5 and 20 characters', () => {
    const name = '1234';
    const expectedErrors = ['minlength'];

    validateGameName(name, expectedErrors);

    const nameControl = component.gameForm.get('name');
    expect(nameControl?.hasError('minlength')).toBeTruthy();

    const validName = 'Partida Válida';
    validateGameName(validName);
  });

  it('should validate name does not have more than 3 numbers', () => {
    validateGameName('Game1234', ['tooManyNumbers']);
  });


  it('should reset error timeout after 5 seconds', fakeAsync(() => {
    component.showErrors = true;
    component.resetErrorTimeout();
    tick(5000);

    expect(component.showErrors).toBeFalsy();
  }));

  it('should validate name does not exceed 20 characters', () => {
    const name = 'A very long name that is too long';
    const expectedErrors = ['maxlength'];

    validateGameName(name, expectedErrors);
  });


  it('should validate name does not have more than 3 numbers', () => {
    const name = 'Game1234';
    const expectedErrors = ['tooManyNumbers'];

    validateGameName(name, expectedErrors);
  });


  it('should require a name', () => {
    const name = '';
    const expectedErrors = ['required'];

    validateGameName(name, expectedErrors);
  });

  it('should emit create game event when form is valid', () => {
    const createGameSpy = jest.spyOn(component.createGame, 'emit');
    const nameControl = component.gameForm.get('name');

    nameControl?.setValue('Partida Válida');
    component.onSubmit();

    expect(createGameSpy).toHaveBeenCalledWith({
      name: 'Partida Válida'
    });
  });

  it('should not emit create game event when form is invalid', () => {
    const createGameSpy = jest.spyOn(component.createGame, 'emit');
    const nameControl = component.gameForm.get('name');

    nameControl?.setValue('');
    component.onSubmit();

    expect(createGameSpy).not.toHaveBeenCalled();
  });

  it('should validate name does not contain special characters', () => {
    validateGameName('Game!@#', ['specialCharacters']);
  });

  it('should return correct error message for different validation errors', () => {
    const nameControl = component.gameForm.get('name');
    nameControl?.setValue('');
    nameControl?.markAsTouched();
    component.showErrors = true;
    expect(component.getErrorMessage()).toBe(NAME_REQUIERED);

    nameControl?.setValue('1234');
    expect(component.getErrorMessage()).toBe(NAME_LENGHT);

    nameControl?.setValue('A very long game name that exceeds the maximum length');
    expect(component.getErrorMessage()).toBe(NAME_LENGHT);
  });

  it('should show errors when form is submitted with invalid data', () => {
    component.onSubmit();
    expect(component.showErrors).toBeTruthy();
  });

  it('should mark form controls as touched when submitted', () => {
    const nameControl = component.gameForm.get('name');
    component.onSubmit();
    expect(nameControl?.touched).toBeTruthy();
  });

  it('should not emit create game event when form is touched but invalid', () => {
    const createGameSpy = jest.spyOn(component.createGame, 'emit');
    const nameControl = component.gameForm.get('name');

    nameControl?.setValue('');
    nameControl?.markAsTouched();
    component.onSubmit();

    expect(createGameSpy).not.toHaveBeenCalled();
  });


});
