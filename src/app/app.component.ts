import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Planning-Poker';

  ngOnInit(): void {
    setTimeout(() => {
      const logoContainer = document.getElementById('logoContainer');
      if (logoContainer) {
        logoContainer.classList.add('loaded');
      }
    }, 200);
  }


  onInputChanged(newValue: string): void {
    console.log('Nuevo valor del input:', newValue);
  }

  onSubmit(): void {
    console.log("Formulario enviado!");
  }
}
