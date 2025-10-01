using RadioQ10.Models;

namespace RadioQ10.Services;

public interface IYouTubeSearchService
{
    Task<IReadOnlyList<YouTubeVideo>> SearchAsync(string query, CancellationToken cancellationToken = default);
}

