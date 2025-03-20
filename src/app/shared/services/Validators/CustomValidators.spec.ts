import { CustomValidators } from "./CustomValidators";
import { AbstractControl} from '@angular/forms';

describe('CustomValidators', () => {
  describe('gameNameValidator', () => {
    let control: AbstractControl;

    it('should return null if value is empty', () => {
      control = { value: '' } as AbstractControl;
      const result = CustomValidators.gameNameValidator(control);
      expect(result).toBeNull();
    });

    it('should return error "length" if value length is less than 5', () => {
      control = { value: 'abcd' } as AbstractControl;
      const result = CustomValidators.gameNameValidator(control);
      expect(result).toEqual({ length: true });
    });

    it('should return error "length" if value length is greater than 20', () => {
      control = { value: 'a'.repeat(21) } as AbstractControl;
      const result = CustomValidators.gameNameValidator(control);
      expect(result).toEqual({ length: true });
    });

    it('should return error "specialCharacters" if value contains special characters', () => {
      control = { value: 'game@name' } as AbstractControl;
      const result = CustomValidators.gameNameValidator(control);
      expect(result).toEqual({ specialCharacters: true });
    });

    it('should return error "tooManyNumbers" if value contains more than 3 numbers', () => {
      control = { value: 'game1234' } as AbstractControl;
      const result = CustomValidators.gameNameValidator(control);
      expect(result).toEqual({ tooManyNumbers: true });
    });

    it('should return error "onlyNumbers" if value contains only numbers', () => {
      control = { value: '12345' } as AbstractControl;
      const result = CustomValidators.gameNameValidator(control);
      expect(result).toEqual({ onlyNumbers: true });
    });

    it('should return null if value is valid', () => {
      control = { value: 'validGame' } as AbstractControl;
      const result = CustomValidators.gameNameValidator(control);
      expect(result).toBeNull();
    });
  });
});
