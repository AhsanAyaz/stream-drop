import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Firestore, collection, deleteDoc, collectionChanges, DocumentChangeType, onSnapshot, getDocs, CollectionReference } from '@angular/fire/firestore';
import { AngularFireModule } from '@angular/fire/compat';

type DroppedElement = {
  el: HTMLElement,
  username: string,
  url: string,
  channel: string
  angle: number;
}

type Message = {
  imageUrl: string;
  username: string;
  text: string;
}

type ScoreItem = {
  username: string;
  score: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AngularFireModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  originalParachuteHeight = 100;
  originalEntityHeight = 40;
  originalEntityTop = 20;
  parachuteHeight = 80;
  enitityHeight =
    (this.originalEntityHeight / this.originalParachuteHeight) * this.parachuteHeight;
  entityTop =
    (this.originalEntityTop / this.originalParachuteHeight) * this.parachuteHeight;
  minXVelocity = 2;
  maxXVelocity = 3;
  minYVelocity = 1;
  maxYVelocity = 2;
  textHeight = 20;
  timeoutInSeconds = 45 * 1000;
  maxTop =
    window.innerHeight - (140 / 130) * this.parachuteHeight - this.textHeight;
  sleep = (timeout: number): Promise<void> => {
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve();
      }, timeout)
    );
  };
  timeoutTimer!: ReturnType<typeof setInterval>;
  scoreList: ScoreItem[] = [];
  elements: DroppedElement[] = [];
  firestore = inject(Firestore);

  ngOnInit(): void {
    this.resetMessagesAndObserve();
  }

  async deleteCol(messagesCollectionRef: CollectionReference) {

    // You can use the QuerySnapshot above like in the example i linked
    (await getDocs(messagesCollectionRef)).docs.forEach(doc => {
      deleteDoc(doc.ref);
    })
  }

  async resetMessagesAndObserve() {
    const messagesCollectionRef = collection(this.firestore, '/messages');
    await this.deleteCol(messagesCollectionRef)
    collectionChanges(messagesCollectionRef)
      .subscribe({
        next: (changes) => {
          changes.forEach(change => {
            if (change.type === 'added') {
              const message = change.doc.data() as Message;
              this.onMessage(message);
            }
          })
        }
      })
  }

  onMessage(message: Message) {
    this.drop({
      url: message.imageUrl,
      username: message.username,
      channel: ''
    });
    this.showTargetDartBoard();
    this.showTargetDartBoard();
    this.showScoreBoard();
    this.extendTimeout();
  }

  dropButtonClick() {
    this.drop({
      url: 'https://chat.restream.io/assets/icon-platform/restream-icon-white.svg', username: 'ahsan', channel: ''
    });
    this.showTargetDartBoard();
  }

  async drop({ url, username, channel }: Omit<DroppedElement, 'el' | 'angle'>) {
    const el = document.createElement('DIV');
    el.classList.add('dropping');
    const elContent = `
				<div class="dropping__text">${username}</div>
				<div class="dropping__inner">
					<img class="dropping__parachute" height="${this.parachuteHeight}px" src="assets/drop/rocket-dw.gif" alt="parachute">
					<img class="dropping__entity" style="top:${this.entityTop}px; height:${this.enitityHeight}px;"  src=${url} alt="entity">
				</div>
		`;
    el.innerHTML = elContent;
    const container = document.querySelector('.frameworks-container');
    container!.appendChild(el);
    const droppingEl: DroppedElement = {
      el,
      channel,
      username,
      url,
      angle: 0
    };
    this.elements.push(droppingEl);
    this.animateEl(droppingEl);
  };

  async calculateScore({ el, username, channel, angle }: DroppedElement) {
    const targetBoardEl = document.querySelector('.target-board') as HTMLImageElement;
    const targetBoardWidth = targetBoardEl.width;
    const targetBoardRadius = targetBoardWidth / 2;
    const centerOfTheBoard = targetBoardEl.offsetLeft + targetBoardRadius;
    const rocketEl = el.querySelector('.dropping__inner') as HTMLDivElement;
    const d = Math.sqrt(
      Math.pow(rocketEl.clientWidth, 2) + Math.pow(rocketEl.clientHeight, 2)
    );
    const rocketElOffsetParent = rocketEl.offsetParent as HTMLDivElement;
    const rad = angle * (Math.PI / 180);
    const x =
      rocketElOffsetParent.offsetTop +
      rocketEl.offsetTop +
      rocketEl.clientHeight * Math.cos((rad * Math.PI) / 180);
    let y;
    if (rad < 0) {
      y =
        rocketElOffsetParent.offsetLeft +
        rocketEl.offsetLeft +
        rocketEl.clientWidth +
        d * Math.sin((rad * Math.PI) / 180);
    } else {
      y =
        rocketElOffsetParent.offsetLeft +
        rocketEl.offsetLeft +
        d * Math.sin((rad * Math.PI) / 180);
    }
    const distance = Math.abs(centerOfTheBoard - y);
    if (distance <= targetBoardRadius) {
      const score = (100 - (distance / targetBoardRadius) * 100).toFixed(2);
      this.addScoreToScoreboard(username, score);
      this.renderScoreboard();
    }
  };

  extendTimeout() {
    this.scheduleTimeout();
  };

  executeTimeout() {
    this.hideTargetDartBoard();
    this.hideScoreBoard();
  };

  scheduleTimeout() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
    this.timeoutTimer = setTimeout(() => {
      this.executeTimeout();
    }, this.timeoutInSeconds);
  };

  showTargetDartBoard() {
    document.querySelector('.target-board')!.removeAttribute('hidden');
  };

  hideTargetDartBoard() {
    document.querySelector('.target-board')!.setAttribute('hidden', 'true');
  };

  showScoreBoard() {
    const scoreBoard = document.querySelector('.score-board');
    scoreBoard!.removeAttribute('hidden');
  };

  hideScoreBoard() {
    const scoreBoard = document.querySelector('.score-board');
    scoreBoard!.setAttribute('hidden', 'true');
  };

  sortArrayByScore(array: Array<ScoreItem>) {
    return array.sort((a, b) => {
      if (a.score > b.score) {
        return -1;
      } else if (a.score < b.score) {
        return 1;
      } else {
        return 0;
      }
    });
  };

  renderScoreboard() {
    const scoreBoard = document.querySelector('.score-board');
    if (this.scoreList.length === 0) {
      this.hideScoreBoard();
    } else {
      this.showScoreBoard();
    }
    document
      .querySelectorAll('.score-board__item')
      .forEach((item) => item.remove());

    const sortedScoreArray = this.sortArrayByScore(this.scoreList);
    sortedScoreArray.forEach((scoreItem) => {
      const { username, score } = scoreItem;
      const el = document.createElement('DIV');
      el.classList.add('score-board__item');
      el.innerHTML = `
				<div class="score-board__item__username">${username}</div>
        <div class="score-board__item__score">${score}</div>
			`;
      scoreBoard!.appendChild(el);
    });
  };

  addScoreToScoreboard(username: string, score: string) {
    const existingScoreIndex = this.scoreList.findIndex(
      (scoreItem) => scoreItem.username === username
    );
    if (existingScoreIndex !== -1) {
      this.scoreList[existingScoreIndex] = {
        username,
        score,
      };
    } else {
      this.scoreList.push({
        username,
        score,
      });
    }
  };

  animateElDropped(droppedEl: DroppedElement, maxLeft: number) {
    const { el } = droppedEl;
    el.classList.add('dropped');
    const droppingInnerEl = el.querySelector('.dropping__inner') as HTMLDivElement;
    droppingInnerEl.style.transform = `rotate(0deg)`;
    let xVel = 1;
    const timer = setInterval(() => {
      let newLeft = parseInt(el.style.left) + xVel;
      const newVelocity = Math.random() * 2 + 1;
      if (newLeft <= 0) {
        xVel = newVelocity;
      } else if (newLeft >= maxLeft) {
        xVel = -newVelocity;
      }
      el.style.left = `${newLeft}px`;
      el.style.top = 'unset';
      el.style.bottom = '10px';
    }, 10);
    this.calculateScore(droppedEl);
    setTimeout(() => {
      clearInterval(timer);
      el.remove();
    }, 30000);
  };

  animateEl(droppedEl: DroppedElement) {
    const { el } = droppedEl;
    let start: DOMHighResTimeStamp, previousTimeStamp: DOMHighResTimeStamp;
    let top = 0;
    let left = Math.random() * window.innerWidth - 100;
    let xVelocity = Math.random() * this.maxXVelocity + this.minXVelocity;
    const maxLeft = window.innerWidth - el.clientWidth;

    const yVelocity = Math.random() * this.maxYVelocity + this.minYVelocity;
    const step = (timestamp: DOMHighResTimeStamp) => {
      if (start === undefined) start = timestamp;

      if (previousTimeStamp !== timestamp) {
        const xVel = Math.min(xVelocity, maxLeft);
        const yVel = Math.min(yVelocity, this.maxTop);
        top += yVel;
        left += xVel;
        el.style.top = `${top}px`;
        el.style.left = `${left}px`;
      }

      if (left >= (maxLeft - el.clientWidth)) {
        xVelocity = -Math.abs(xVelocity);
      }
      if (left <= 0) {
        xVelocity = Math.abs(xVelocity);
      }

      droppedEl.angle = Math.atan2(-xVelocity, yVelocity) * (180 / Math.PI);
      const droppedInnerEl = el.querySelector(
        '.dropping__inner'
      ) as HTMLDivElement;
      droppedInnerEl.style.transform = `rotate(${droppedEl.angle}deg)`;

      if (top < this.maxTop) {
        // Stop the animation after 2 seconds
        previousTimeStamp = timestamp;
        window.requestAnimationFrame(step);
      } else {
        this.animateElDropped(droppedEl, maxLeft);
      }
    }

    window.requestAnimationFrame(step);
  };
}
