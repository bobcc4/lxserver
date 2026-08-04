'use strict';

(function exposeWebPlayerState(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.WebPlayerState = api;
})(typeof window === 'undefined' ? globalThis : window, () => {
    function buildSingleTrackPlayback(list, index, useFullList) {
        const source = Array.isArray(list) ? list : [];
        const selected = source[index];
        if (!selected) return { list: [], index: -1 };
        return useFullList === false
            ? { list: [selected], index: 0 }
            : { list: source, index };
    }

    function isSongCollected(listData, songId) {
        if (!listData || !songId) return false;
        if (Array.isArray(listData.loveList) && listData.loveList.some(song => song?.id === songId)) return true;
        return Array.isArray(listData.userList) && listData.userList.some(list => (
            Array.isArray(list?.list) && list.list.some(song => song?.id === songId)
        ));
    }

    return { buildSingleTrackPlayback, isSongCollected };
});
