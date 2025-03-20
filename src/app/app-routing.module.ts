import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateGamePage } from './components/pages/create-game/create-game.component';
import { GamePageComponent } from './components/pages/game.page/game.page.component';
import { RegisterUserComponent } from './components/pages/register.page/register.user.component';
import { PreLoadingComponent } from './components/pages/pre.loading/pre.loading.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'loading',
    pathMatch: 'full'
  },
  {
    path: 'loading',
    component: PreLoadingComponent
  },
  {
    path: 'create-game',
    component: CreateGamePage
  },
  {
    path: 'game/:gameId',
    component: GamePageComponent
  },
  {
    path: 'register/:name/:id',
    component: RegisterUserComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
