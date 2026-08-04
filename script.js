// Trạng thái hiện tại của tiêu đề
let isGreeting = false;

/**
 * Xử lý sự kiện khi bấm nút.
 * Đổi qua lại giữa "Website Test" và "Xin chào!".
 */
function handleClick() {
  const title = document.getElementById('title');
  const btn = document.getElementById('btn');

  if (isGreeting) {
    // Trở về trạng thái ban đầu
    title.textContent = 'Website Test';
    title.classList.remove('hello');
    btn.textContent = 'Bấm vào đây';
  } else {
    // Chuyển sang lời chào
    title.textContent = 'Xin chào!';
    title.classList.add('hello');
    btn.textContent = 'Bấm lại để đặt lại';
  }

  isGreeting = !isGreeting;
}
