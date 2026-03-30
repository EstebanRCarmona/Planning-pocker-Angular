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
  isLoading: boolean = false;
  errorMessage: string = 'El nombre de la partida no debe estar vacío';

  constructor(private fb: FormBuilder) {
    this.gameForm = this.fb.group({
      name: ['']
    });
  }

  ngOnInit() {
    // Auto-focus en el input será manejado por autofocus attribute en el HTML
  }

  onSubmit(): void {
    const name = this.gameForm.get('name')?.value?.trim();
    if (name) {
      this.showErrors = false;
      this.isLoading = true;
      this.createGame.emit(this.gameForm.value);
    } else {
      this.showErrors = true;
      this.startErrorTimeout();
    }
  }

  startErrorTimeout(): void {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.errorTimeout = setTimeout(() => {
      this.showErrors = false;
    }, 4000);
  }
}
