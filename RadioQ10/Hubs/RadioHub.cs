using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace RadioQ10.Hubs;

public sealed class RadioHub : Hub
{
    // Estado global
    private static string? CurrentVideoId;
    private static long? CurrentStartTimestamp;
    private static int CurrentPercent = 0;
    private static bool IsPlaying = false;
    private static Guid? CurrentQueueItemId;

    public override async Task OnConnectedAsync()
    {
        // Envía el estado actual al nuevo cliente
        if (!string.IsNullOrEmpty(CurrentVideoId) && CurrentStartTimestamp.HasValue)
        {
            await Clients.Caller.SendAsync("SyncState", CurrentVideoId, CurrentStartTimestamp.Value, CurrentPercent, IsPlaying, CurrentQueueItemId);
        }
        await base.OnConnectedAsync();
    }

    public async Task Play()
    {
        IsPlaying = true;
        await Clients.All.SendAsync("Play");
    }

    public async Task Pause()
    {
        IsPlaying = false;
        await Clients.All.SendAsync("Pause");
    }

    public async Task SeekPercent(int percent)
    {
        CurrentPercent = percent;
        await Clients.All.SendAsync("SeekPercent", percent);
    }

    public async Task LoadVideos(string id1, long startTimestamp, Guid? queueItemId)
    {
        CurrentVideoId = id1;
        CurrentStartTimestamp = startTimestamp;
        CurrentPercent = 0;
        IsPlaying = true;
        CurrentQueueItemId = queueItemId;
        await Clients.All.SendAsync("LoadVideos", id1, startTimestamp, queueItemId);
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
