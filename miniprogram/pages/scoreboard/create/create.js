Page({
  data: {
    isEdit: false,
    editId: '',
    name: '',
    playerA: '',
    playerB: '',
    saving: false
  },

  onLoad(options) {
    const g = getApp().globalData;
    if (options.mode === 'edit' && g.editBoard) {
      const d = g.editBoard;
      this.setData({
        isEdit: true,
        editId: d._id,
        name: d.name,
        playerA: d.playerA,
        playerB: d.playerB
      });
    }
  },

  onNameInput(e)  { this.setData({ name: e.detail.value }); },
  onPlayerAInput(e) { this.setData({ playerA: e.detail.value }); },
  onPlayerBInput(e) { this.setData({ playerB: e.detail.value }); },

  save() {
    const { name, playerA, playerB } = this.data;
    if (!playerA.trim() || !playerB.trim()) {
      wx.showToast({ title: '请填写双方选手名称', icon: 'none' });
      return;
    }
    this.setData({ saving: true });

    const payload = {
      action: this.data.isEdit ? 'update' : 'create',
      name: name.trim() || '未命名比赛',
      playerA: playerA.trim(),
      playerB: playerB.trim()
    };
    if (this.data.isEdit) payload.id = this.data.editId;

    wx.cloud.callFunction({ name: 'scoreboard', data: payload })
      .then(res => {
        if (this.data.isEdit) {
          // 把更新后的数据写回 globalData，detail 页 onShow 直接用
          const g = getApp().globalData;
          const old = g.editBoard;
          g.updatedBoard = {
            ...old,
            name: name.trim() || '未命名比赛',
            playerA: playerA.trim(),
            playerB: playerB.trim(),
            updatedAt: new Date()
          };
          g.editBoard = null;
          wx.showToast({ title: '已更新', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 300);
        } else {
          wx.redirectTo({
            url: '/pages/scoreboard/detail/detail?id=' + res.result._id
          });
        }
      })
      .catch(() => {
        wx.showToast({ title: '保存失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ saving: false });
      });
  }
});
