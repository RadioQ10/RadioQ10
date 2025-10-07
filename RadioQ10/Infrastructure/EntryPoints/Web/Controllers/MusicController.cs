using Microsoft.AspNetCore.Mvc;
using RadioQ10.Application.Interfaces;
using RadioQ10.Domain.Entities;
using System.Threading.Tasks;

namespace RadioQ10.Infrastructure.EntryPoints.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class MusicController : ControllerBase
{
    private readonly IYouTubeSearchService _youTubeSearch;
    private readonly ISongQueueService _songQueueService;

    public MusicController(IYouTubeSearchService youTubeSearch, ISongQueueService songQueueService)
    {
        _youTubeSearch = youTubeSearch;
        _songQueueService = songQueueService;
    }

    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<YouTubeVideo>>> SearchAsync([FromQuery] string query, CancellationToken cancellationToken)
    {
        var results = await _youTubeSearch.SearchAsync(query, cancellationToken);
        return Ok(results);
    }

    [HttpGet("queue")]
    public ActionResult<IReadOnlyCollection<SongQueueItem>> GetQueue()
    {
        var queue = _songQueueService.GetAll();
        return Ok(queue);
    }

    [HttpGet("queue/{id:guid}")]
    public ActionResult<SongQueueItem> GetQueueItem(Guid id)
    {
        var item = _songQueueService.Get(id);
        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }

    [HttpPost("queue")]
    public async Task<ActionResult> Enqueue([FromBody] AddSongRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        if (request.UserId == Guid.Empty)
        {
            ModelState.AddModelError(nameof(request.UserId), "El identificador de usuario es obligatorio.");
            return ValidationProblem(ModelState);
        }

        try
        {
            var item = await _songQueueService.Enqueue(request.VideoId, request.Title, request.ChannelTitle, request.ThumbnailUrl, request.UserId, request.RequestedBy);
            if(item is null)
            {
                return Conflict();
            }
            return CreatedAtAction(nameof(GetQueueItem), new { id = item.Id }, item);
        }
        catch (ArgumentException ex)
        {
            ModelState.AddModelError(ex.ParamName ?? string.Empty, ex.Message);
            return ValidationProblem(ModelState);
        }
    }

    [HttpDelete("queue/{id:guid}")]
    public IActionResult Remove(Guid id)
    {
        var removed = _songQueueService.Remove(id);
        if (!removed)
        {
            return NotFound();
        }

        return NoContent();
    }
}

