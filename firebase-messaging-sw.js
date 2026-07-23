/* Clark Golf Group — FCM background service worker.
   MUST live at the site root (served as /firebase-messaging-sw.js). */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

var FB_PROD={apiKey:"AIzaSyBrYlN16zSJQ6pRRQBhBn4YLA7FzkmqJfg",authDomain:"clark-group-dd15e.firebaseapp.com",databaseURL:"https://clark-group-dd15e-default-rtdb.firebaseio.com",projectId:"clark-group-dd15e",storageBucket:"clark-group-dd15e.firebasestorage.app",messagingSenderId:"92891899165",appId:"1:92891899165:web:817f5f164f3fc50b506df4"};
var FB_TEST={apiKey:"AIzaSyCQHKnl22opc8HIaCHRM34kHIgyVDE65Yk",authDomain:"clark-group-test.firebaseapp.com",databaseURL:"https://clark-group-test-default-rtdb.firebaseio.com",projectId:"clark-group-test",storageBucket:"clark-group-test.firebasestorage.app",messagingSenderId:"141407112439",appId:"1:141407112439:web:17460c6eb5baf4502b97f2"};
var IS_PROD = self.location.hostname === 'clark-golf-group-two.vercel.app';
firebase.initializeApp(IS_PROD ? FB_PROD : FB_TEST);

var messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload){
  var d = (payload && payload.data) || {};
  self.registration.showNotification(d.title || 'Clark Golf Group', {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: d.url || '/' },
    tag: d.tag || undefined,
  });
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
    for (var i=0;i<list.length;i++){ if ('focus' in list[i]) return list[i].focus(); }
    return clients.openWindow(url);
  }));
});
