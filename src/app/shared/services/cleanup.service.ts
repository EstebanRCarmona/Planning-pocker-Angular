import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CleanupService {

  constructor() {
    // NO hacer nada en beforeunload o pagehide
    // sessionStorage se limpia automáticamente cuando cierras la ventana
    // localStorage también se limpia cuando cierras la ventana (en la estrategia final)
  }

  // Método para limpiar datos manualmente si es necesario
  public forceCleanup(): void {
    // Limpiar sessionStorage completamente
    sessionStorage.clear();
  }
}

