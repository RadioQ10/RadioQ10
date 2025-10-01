using Microsoft.AspNetCore.SignalR;

namespace RadioQ10.Hubs;

public sealed class RadioHub : Hub
{
    public Task JoinRoom(string room)
    {
        if (string.IsNullOrWhiteSpace(room))
        {
            throw new ArgumentException("Room cannot be empty.", nameof(room));
        }

        return Groups.AddToGroupAsync(Context.ConnectionId, room);
    }

    public async Task SendNumber(string room, int number)
    {
        if (string.IsNullOrWhiteSpace(room))
        {
            throw new ArgumentException("Room cannot be empty.", nameof(room));
        }

        await Clients.Group(room).SendAsync("ReceiveNumber", number);
    }
}

