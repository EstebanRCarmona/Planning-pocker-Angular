import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
  @Input() title: string = '';
  @Input() overlay: string | null = null;
  @Input() voted: number | null = null;
  @Input() userRole: boolean=false;
  @Input() adminTransferOptions: boolean = false;
  constructor() { }

  ngOnInit(): void {
  }
  getOverlayStyle(): { [klass: string]: any } {
    return this.overlay ? { 'background-color': this.overlay } : {};
  }

}
