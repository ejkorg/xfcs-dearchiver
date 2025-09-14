import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { StepperShellComponent } from './stepper-shell/stepper-shell.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, StepperShellComponent]
})
export class AppComponent {}
