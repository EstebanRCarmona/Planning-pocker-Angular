import { Component, Input, Output, EventEmitter, forwardRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
export class InputAtomComponent implements ControlValueAccessor, AfterViewInit {
  @Input() title: string = '';
  @Input() placeholder: string = '';
  @Input() autofocus = false;
  @Input() selectOnFocus = true;
  @Output() valueChanged: EventEmitter<string> = new EventEmitter();
  @Input() error: boolean = false;

  @ViewChild('inputField') inputField!: ElementRef<HTMLInputElement>;

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

  ngAfterViewInit(): void {
    if (this.autofocus && this.inputField?.nativeElement) {
      setTimeout(() => {
        this.inputField.nativeElement.focus();
        if (this.selectOnFocus) {
          this.inputField.nativeElement.select();
        }
      }, 0);
    }
  }

  onInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue = value;
    this.onChange(this.inputValue);
    this.valueChanged.emit(this.inputValue);
  }
}
