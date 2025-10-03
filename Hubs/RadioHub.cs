using Microsoft.AspNetCore.SignalR;

namespace RadioQ10.Hubs;

public sealed class RadioHub : Hub
{
    public async Task Play()
    {
        await Clients.Others.SendAsync("Play");
    }

    public async Task Pause()
    {
        await Clients.Others.SendAsync("Pause");
    }

    public async Task SeekPercent(int percent)
    {
        await Clients.Others.SendAsync("SeekPercent", percent);
    }

    public async Task LoadVideos(string id1, double time)
    {
        await Clients.All.SendAsync("LoadVideos", id1, time);
    }

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

