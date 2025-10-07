using Microsoft.AspNetCore.SignalR;

namespace RadioQ10.Infrastructure.EntryPoints.SignalR;

public sealed class RadioHub : Hub
{
    // Estado global
    private static string? CurrentVideoId;
    private static long? CurrentStartTimestamp;
    private static int CurrentPercent = 0;
    private static bool IsPlaying = false;
    private static Guid? CurrentQueueItemId;
    public static Dictionary<string, List<string>> UsersActuals = new();
    private static int ConnectionCount = 0;

    public override async Task OnConnectedAsync()
    {
        Interlocked.Increment(ref ConnectionCount);
        await Clients.All.SendAsync("UserCount", ConnectionCount);
        // Envía el estado actual al nuevo cliente
        if (!string.IsNullOrEmpty(CurrentVideoId) && CurrentStartTimestamp.HasValue)
        {
            await Clients.Caller.SendAsync("SyncState", CurrentVideoId, CurrentStartTimestamp.Value, CurrentPercent, IsPlaying, CurrentQueueItemId);
        }
        await base.OnConnectedAsync();
    }

    public async Task UserInfo(string user)
    {
        if (UsersActuals.TryGetValue(user, out var value))
        {
            value.Add(Context.ConnectionId);
        }
        else
        {
            UsersActuals[user] = [Context.ConnectionId];
        }

        await Clients.All.SendAsync("UserListUpdate");
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var actualUser = UsersActuals.FirstOrDefault(x => x.Value.Contains(Context.ConnectionId));

        if (actualUser.Key is null || actualUser.Value is null)
        {
            await base.OnDisconnectedAsync(exception);
            return;
        }

        actualUser.Value.Remove(Context.ConnectionId);

        if (actualUser.Value.Count == 0)
        {
            UsersActuals.Remove(actualUser.Key);
        }

        await Clients.All.SendAsync("UserListUpdate");
        await base.OnDisconnectedAsync(exception);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Interlocked.Decrement(ref ConnectionCount);
        await Clients.All.SendAsync("UserCount", ConnectionCount);
        await base.OnDisconnectedAsync(exception);
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

    public async Task UpdateQueue()
    {
        await Clients.All.SendAsync("UpdateQueue");
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

    public Task<int> GetUserCount()
    {
        return Task.FromResult(ConnectionCount);
    }
}
