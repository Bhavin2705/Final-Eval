// Toggle the hamburger menu
document.getElementById('menu-btn').addEventListener('click', function () {
    this.classList.toggle('open');
    document.getElementById('mobile-menu').classList.toggle('open');
});



function handleActionClick(button) {
    const requestDiv = button.closest('.friend-request');
    const friendRequestsContainer = document.getElementById('friend-requests-container');

    requestDiv.classList.add('fade-out');

    requestDiv.addEventListener('animationend', () => {
        requestDiv.remove();

        const remainingRequests = friendRequestsContainer.querySelectorAll('.friend-request');
        if (remainingRequests.length === 0) {
            const noRequestsMessage = document.querySelector('.no-requests');
            noRequestsMessage.classList.remove('hidden');
        }
    });
}

// Accept Friend Request
document.querySelectorAll('.accept-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const friendRequest = e.target.closest('.friend-request');
        friendRequest.classList.add('bg-green-100');
        friendRequest.querySelector('.accept-btn').disabled = true;
        friendRequest.querySelector('.decline-btn').disabled = true;
    });
});

document.querySelectorAll('.decline-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const friendRequest = e.target.closest('.friend-request');
        friendRequest.classList.add('bg-green-100');
        friendRequest.querySelector('.accept-btn').disabled = true;
        friendRequest.querySelector('.decline-btn').disabled = true;
    });
});
