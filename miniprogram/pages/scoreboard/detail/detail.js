Page({
  data: {
    id: '',
    board: null,
    loading: true,
    acting: false,
    // 全屏示牌
    showCard: false,
    cardType: '',
    cardPlayer: ''
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.setData({ id: options.id });
    this.load();
  },

  onShow() {
    const g = getApp().globalData;
    if (g.updatedBoard && g.updatedBoard._id === this.data.id) {
      this.setData({ board: this.formatBoard(g.updatedBoard), loading: false });
      g.updatedBoard = null;
    } else if (this.data.board && this.data.id) {
      this.load();
    }
  },

  load() {
    const g = getApp().globalData;
    if (g.updatedBoard && g.updatedBoard._id === this.data.id) {
      this.setData({ board: this.formatBoard(g.updatedBoard), loading: false });
      g.updatedBoard = null;
      return;
    }

    wx.cloud.callFunction({
      name: 'scoreboard',
      data: { action: 'get', id: this.data.id }
    }).then(res => {
      const b = res.result;
      if (!b) {
        wx.showToast({ title: '记分牌不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 800);
        return;
      }
      this.setData({ board: this.formatBoard(b), loading: false });
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    });
  },

  formatBoard(b) {
    b.createdAt = this.fmt(b.createdAt);
    b.updatedAt = this.fmt(b.updatedAt);
    if (b.finishedAt) b.finishedAt = this.fmt(b.finishedAt);
    if (b.duration != null) {
      b.durationText = b.duration >= 60
        ? Math.floor(b.duration / 60) + '小时' + (b.duration % 60) + '分钟'
        : b.duration + '分钟';
    }
    // 计算各项统计
    b.totalCards = (b.yellowCardsA || 0) + (b.yellowCardsB || 0) + (b.redCardsA || 0) + (b.redCardsB || 0);
    if (b.scoreHistory && b.scoreHistory.length > 0) {
      b.scoreHistory = b.scoreHistory.map(h => {
        h.time = this.fmt(h.time);
        return h;
      });
    }
    return b;
  },

  call(action, extra) {
    if (this.data.acting) return;
    this.setData({ acting: true });
    wx.cloud.callFunction({
      name: 'scoreboard',
      data: { action, id: this.data.id, ...extra }
    }).then(() => {
      this.load();
    }).catch(() => {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }).finally(() => {
      this.setData({ acting: false });
    });
  },

  changeScore(e) {
    const { player, delta } = e.currentTarget.dataset;
    const b = this.data.board;
    if (!b || b.status === 'finished') return;
    const ns = (player === 'A' ? b.scoreA : b.scoreB) + delta;
    if (ns < 0) return;
    this.call('updateScore', { player, newScore: ns, previousScore: player === 'A' ? b.scoreA : b.scoreB });
  },

  toggleCard(e) {
    if (!this.data.board || this.data.board.status === 'finished') return;
    const player = e.currentTarget.dataset.player;
    const cardType = e.currentTarget.dataset.cardType;

    const b = { ...this.data.board };
    const field = cardType === 'yellow'
      ? (player === 'A' ? 'yellowCardsA' : 'yellowCardsB')
      : (player === 'A' ? 'redCardsA' : 'redCardsB');
    const current = b[field] || 0;
    const newVal = current + 1;
    b[field] = newVal;
    b.scoreHistory = b.scoreHistory || [];
    b.scoreHistory.push({
      action: cardType + 'Card',
      player,
      from: current,
      to: newVal,
      time: this.fmt(new Date())
    });
    this.setData({ board: b });

    if (newVal > 0) {
      this.setData({ showCard: true, cardType: cardType, cardPlayer: player });
      setTimeout(() => {
        this.setData({ showCard: false });
      }, 1800);
    }

    wx.cloud.callFunction({
      name: 'scoreboard',
      data: { action: 'toggleCard', id: this.data.id, player, cardType }
    }).catch(() => {
      b[field] = current;
      b.scoreHistory.pop();
      this.setData({ board: b, showCard: false });
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  undo() {
    const b = this.data.board;
    if (!b || b.status === 'finished') return;
    if (!b.scoreHistory || b.scoreHistory.length === 0) {
      wx.showToast({ title: '没有可撤回的操作', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '撤回',
      content: '确定撤回上一步操作吗？',
      success: res => {
        if (res.confirm) this.call('undo');
      }
    });
  },

  finishGame() {
    wx.showModal({
      title: '结束比赛',
      content: '确定结束比赛吗？结束后不可修改。',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '结束中...' });
          this.setData({ acting: true });
          wx.cloud.callFunction({
            name: 'scoreboard',
            data: { action: 'finish', id: this.data.id }
          }).then(res => {
            wx.hideLoading();
            const result = res.result;
            if (result.error) {
              wx.showToast({ title: result.error, icon: 'none' });
              return;
            }
            wx.showToast({ title: '比赛结束', icon: 'success' });
            this.load();
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '操作失败', icon: 'none' });
          }).finally(() => {
            this.setData({ acting: false });
          });
        }
      }
    });
  },

  editBoard() {
    getApp().globalData.editBoard = this.data.board;
    wx.navigateTo({ url: '/pages/scoreboard/create/create?mode=edit' });
  },

  fmt(date) {
    if (!date) return '';
    const d = new Date(date);
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  },

  onShareAppMessage() {
    const b = this.data.board;
    if (!b) return { title: '羽毛球记分牌' };
    if (b.status === 'finished') {
      const winnerText = b.winner === '平局' ? '双方打平' : b.winner + '获胜';
      return {
        title: '比赛结束 ' + winnerText + ' ' + b.scoreA + ':' + b.scoreB + ' — ' + b.name,
        path: '/pages/scoreboard/detail/detail?id=' + this.data.id
      };
    }
    return {
      title: b.playerA + ' ' + b.scoreA + ':' + b.scoreB + ' ' + b.playerB + ' — ' + b.name,
      path: '/pages/scoreboard/detail/detail?id=' + this.data.id
    };
  }
});
