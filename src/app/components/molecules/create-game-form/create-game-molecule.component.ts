import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateGameRequest } from '../../../shared/interfaces/game.model';
import { CustomValidators } from 'src/app/shared/services/Validators/CustomValidators';
import { NAME_CANNOT_ONLY_NUMBERS, NAME_LENGHT, NAME_MAX_3_NUMBERS, NAME_NO_SPECIAL_CHARACTERS, NAME_REQUIERED } from 'src/app/shared/Constants';

@Component({
  selector: 'app-create-game-form',
  templateUrl: './create-game-molecule.component.html',
  styleUrls: ['./create-game-molecule.component.scss']
})
export class CreateGameFormComponent implements OnInit {
  gameForm: FormGroup;
  @Output() createGame = new EventEmitter<CreateGameRequest>();
  showErrors = false;
  errorTimeout: any;

  constructor(private fb: FormBuilder) {
    this.gameForm = this.fb.group({
      name: ['', [
        Validators.required,
        CustomValidators.gameNameValidator
      ]]
    });
  }

  ngOnInit() {
    this.gameForm.get('name')?.valueChanges.subscribe(() => {
      this.showErrors = true;
      this.gameForm.get('name')?.markAsTouched();
      this.resetErrorTimeout();
    });
  }

  getErrorMessage(): string {
    const control = this.gameForm.get('name');
    if (control?.errors && this.showErrors) {
      if (control.errors['required']) return NAME_REQUIERED;
      if (control.errors['minlength']) return NAME_LENGHT;
      if (control.errors['maxlength']) return NAME_LENGHT;
      if (control.errors['specialCharacters']) return NAME_NO_SPECIAL_CHARACTERS;
      if (control.errors['tooManyNumbers']) return NAME_MAX_3_NUMBERS;
      if (control.errors['onlyNumbers']) return NAME_CANNOT_ONLY_NUMBERS;
    }
    return '';
  }

  onSubmit(): void {
    this.showErrors = true;
    if (this.gameForm.valid) {
      this.createGame.emit(this.gameForm.value);
    } else {
      this.gameForm.markAllAsTouched();
    }
  }

  resetErrorTimeout() {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.errorTimeout = setTimeout(() => {
      this.showErrors = false;
    }, 5000);
  }
}
