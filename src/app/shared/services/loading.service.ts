import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private hasSeenLoading = false;

  setLoadingShown(): void {
    this.hasSeenLoading = true;
    sessionStorage.setItem('loadingShown', 'true');
  }

  hasLoadingBeenShown(): boolean {
    return sessionStorage.getItem('loadingShown') === 'true';
  }

  clearLoading(): void {
    this.hasSeenLoading = false;
    sessionStorage.removeItem('loadingShown');
  }
}
