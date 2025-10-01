using RadioQ10.Models;

namespace RadioQ10.Services;

public sealed class SongQueueService : ISongQueueService
{
    private readonly List<SongQueueItem> _queue = new();
    private readonly object _syncRoot = new();

    public IReadOnlyCollection<SongQueueItem> GetAll()
    {
        lock (_syncRoot)
        {
            return _queue.ToArray();
        }
    }

    public SongQueueItem? Get(Guid id)
    {
        lock (_syncRoot)
        {
            return _queue.FirstOrDefault(item => item.Id == id);
        }
    }

    public SongQueueItem Enqueue(string videoId, string title, string? channelTitle, string? thumbnailUrl, string? requestedBy)
    {
        var item = new SongQueueItem
        {
            Id = Guid.NewGuid(),
            VideoId = videoId,
            Title = title,
            ChannelTitle = channelTitle,
            ThumbnailUrl = thumbnailUrl,
            RequestedBy = requestedBy,
            EnqueuedAt = DateTimeOffset.UtcNow
        };

        lock (_syncRoot)
        {
            _queue.Add(item);
        }

        return item;
    }

    public bool Remove(Guid id)
    {
        lock (_syncRoot)
        {
            var index = _queue.FindIndex(item => item.Id == id);
            if (index < 0)
            {
                return false;
            }

            _queue.RemoveAt(index);
            return true;
        }
    }
}

