import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-input-atom',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputAtomComponent),
      multi: true
    }
  ]
})
export class InputAtomComponent implements ControlValueAccessor {
  @Input() title: string = '';
  @Input() placeholder: string = '';
  @Output() valueChanged: EventEmitter<string> = new EventEmitter();
  @Input() error: boolean = false;

  inputValue: string = '';

  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.inputValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
  }

  onInputChange(): void {
    this.onChange(this.inputValue);
    this.valueChanged.emit(this.inputValue);
  }
}
