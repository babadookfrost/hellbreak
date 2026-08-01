import { metaState, saveMeta } from '../utils/Loot';

export class NetworkManagerClass {
  private ws: WebSocket | null = null;
  private connected: boolean = false;

  constructor() {
    this.connect();
  }

  public connect() {
    if (typeof window === 'undefined') return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:3000';
      this.ws = new WebSocket(`${protocol}//${host}`);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('NetworkManager: Подключено к серверу Hellbreak.');

        // Отправляем запрос на получение актуального глобального лидерборда
        this.send({ type: 'get_leaderboard' });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.warn('NetworkManager: Ошибка разбора сообщения сервера:', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('NetworkManager: Соединение с сервером Hellbreak закрыто.');
        // Попытка переподключения через 5 секунд
        setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch (e) {
      console.warn('NetworkManager: Не удалось установить WebSocket соединение:', e);
    }
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'leaderboard_data':
        console.log('NetworkManager: Получены данные лидерборда:', msg.data);
        if (typeof (window as any).onLeaderboardReceived === 'function') {
          (window as any).onLeaderboardReceived(msg.data);
        }
        break;

      case 'sync_progress':
        // Синхронизация прогресса с сервера
        if (msg.meta) {
          Object.assign(metaState, msg.meta);
          saveMeta();
          console.log('NetworkManager: Прогресс синхронизирован с сервером.');
        }
        break;

      default:
        break;
    }
  }

  public send(data: any) {
    if (this.ws && this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public submitHighScore(name: string, score: number, wave: number, level: number) {
    this.send({
      type: 'submit_score',
      name,
      score,
      wave,
      level
    });
  }

  public backupProgress() {
    this.send({
      type: 'backup_progress',
      meta: metaState
    });
  }
}

export const NetworkManager = new NetworkManagerClass();
(window as any).NetworkManager = NetworkManager;
