import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {

  @Input() number!: number | string;
  @Input() votes?: number;
  @Input() isVoted: boolean = false;
  @Input() disabled: boolean = false;

  @Output() cardSelected: EventEmitter<number | string> = new EventEmitter<number | string>();

  constructor() { }

  ngOnInit(): void {
  }

  onCardClick(): void {
    if (!this.disabled) {
      this.cardSelected.emit(this.number);
    }
  }
}
