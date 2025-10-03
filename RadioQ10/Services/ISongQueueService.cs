using RadioQ10.Models;

namespace RadioQ10.Services;

public interface ISongQueueService
{
    IReadOnlyCollection<SongQueueItem> GetAll();

    SongQueueItem? Get(Guid id);

    SongQueueItem Enqueue(string videoId, string title, string? channelTitle, string? thumbnailUrl, string? requestedBy);

    bool Remove(Guid id);
}

