import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-hello-world',
  template: `
    <h1>{{ msg }}</h1>
    <div class="card">
      <button mat-raised-button color="primary" (click)="count = count + 1">count is {{ count }}</button>
      <p>Edit <code>components/HelloWorld</code> to test HMR</p>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, MatButtonModule]
})
export class HelloWorldComponent {
  @Input() msg = 'Hello World from Angular';
  count = 0;
}
